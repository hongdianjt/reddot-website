package com.reddotchip.website.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class HlsTranscodeService {
  private static final Duration TIMEOUT = Duration.ofMinutes(15);
  private final String ffmpegCommand;

  public record Result(boolean success, String playlist, String message) {}

  public HlsTranscodeService(@Value("${app.video.ffmpeg-command:ffmpeg}") String ffmpegCommand) {
    this.ffmpegCommand = resolveCommand(ffmpegCommand);
  }

  public Result transcode(Path source, Path outputDirectory, String publicDirectory) {
    if (!available()) return new Result(false, "", "视频已上传，但服务器未安装 FFmpeg，暂时使用 MP4 回退播放");
    try {
      Files.createDirectories(outputDirectory);
      Rendition high = createRendition(source, outputDirectory, "720p", 1280, 720, "22", "2800k");
      Rendition low = createRendition(source, outputDirectory, "480p", 854, 480, "24", "1200k");
      if (!high.success && !low.success) {
        String detail = high.message.isEmpty() ? low.message : high.message;
        return new Result(false, "", "视频已上传，但 HLS 分片生成失败" + (detail.isEmpty() ? "" : "：" + detail));
      }
      StringBuilder master = new StringBuilder("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n");
      if (high.success) master.append("#EXT-X-STREAM-INF:BANDWIDTH=3000000,AVERAGE-BANDWIDTH=2200000,RESOLUTION=1280x720\n720p/index.m3u8\n");
      if (low.success) master.append("#EXT-X-STREAM-INF:BANDWIDTH=1400000,AVERAGE-BANDWIDTH=950000,RESOLUTION=854x480\n480p/index.m3u8\n");
      Files.writeString(outputDirectory.resolve("master.m3u8"), master, StandardCharsets.UTF_8);
      return new Result(true, publicDirectory + "/master.m3u8", "视频上传及 HLS 分片处理完成（自适应 720P / 480P）");
    } catch (IOException error) {
      return new Result(false, "", "视频已上传，但 HLS 分片生成失败：" + safeMessage(error));
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return new Result(false, "", "视频已上传，但 HLS 分片处理被中断，暂时使用 MP4 回退播放");
    }
  }

  private Rendition createRendition(Path source, Path outputDirectory, String name, int width, int height, String crf, String maxRate) throws IOException, InterruptedException {
    Path directory = outputDirectory.resolve(name);
    Files.createDirectories(directory);
    Path playlist = directory.resolve("index.m3u8"), log = directory.resolve("transcode.log");
    List<String> command = new ArrayList<>(List.of(
      ffmpegCommand, "-hide_banner", "-loglevel", "error", "-y", "-i", source.toString(),
      "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "veryfast", "-crf", crf,
      "-maxrate", maxRate, "-bufsize", maxRate, "-vf", "scale=w=" + width + ":h=" + height + ":force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-force_key_frames", "expr:gte(t,n_forced*4)",
      "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments+temp_file",
      "-hls_segment_filename", directory.resolve("segment-%05d.ts").toString(), playlist.toString()
    ));
    Process process = new ProcessBuilder(command).redirectError(log.toFile()).redirectOutput(log.toFile()).start();
    boolean finished = process.waitFor(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
    if (!finished) { process.destroyForcibly(); return new Rendition(false, "处理超时"); }
    if (process.exitValue() == 0 && Files.isRegularFile(playlist)) { Files.deleteIfExists(log); return new Rendition(true, ""); }
    String detail = Files.isRegularFile(log) ? Files.readString(log, StandardCharsets.UTF_8).trim() : "";
    if (detail.length() > 300) detail = detail.substring(detail.length() - 300);
    return new Rendition(false, detail);
  }

  private record Rendition(boolean success, String message) {}

  private boolean available() {
    try {
      Process process = new ProcessBuilder(ffmpegCommand, "-hide_banner", "-h", "muxer=hls").redirectErrorStream(true).start();
      String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
      return process.waitFor(5, TimeUnit.SECONDS) && process.exitValue() == 0 && output.contains("Muxer hls");
    } catch (IOException error) {
      return false;
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  private static String resolveCommand(String configured) {
    if (configured != null && !configured.isBlank() && !configured.equals("ffmpeg")) return configured;
    for (String candidate : List.of("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg", Path.of("node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg").toAbsolutePath().toString(), "/Applications/Trae CN.app/Contents/Resources/app/bin/ffmpeg")) {
      if (Files.isExecutable(Path.of(candidate))) return candidate;
    }
    return configured == null || configured.isBlank() ? "ffmpeg" : configured;
  }

  private static String safeMessage(Exception error) {
    String message = String.valueOf(error.getMessage()).replaceAll("[\\r\\n]+", " ").trim();
    return message.toLowerCase(Locale.ROOT).contains("cannot run program") ? "FFmpeg 不可用" : message;
  }
}

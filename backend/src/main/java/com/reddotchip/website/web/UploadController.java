package com.reddotchip.website.web;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
public class UploadController {
  private static final long IMAGE_LIMIT = 8L * 1024 * 1024;
  private static final long MEDIA_LIMIT = 100L * 1024 * 1024;
  private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
  private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "webm", "mov");
  private static final Pattern DATA_IMAGE = Pattern.compile("^data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$");
  private final Path uploadDirectory;

  public UploadController(@Value("${app.web-root}") String webRoot) throws IOException {
    uploadDirectory = Path.of(webRoot).toAbsolutePath().normalize().resolve("assets/uploads");
    Files.createDirectories(uploadDirectory);
  }

  @PostMapping("/upload-file")
  public Map<String, Object> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty()) throw new IllegalArgumentException("请选择文件");
    String extension = extension(file.getOriginalFilename());
    boolean image = IMAGE_EXTENSIONS.contains(extension), video = VIDEO_EXTENSIONS.contains(extension);
    if (!image && !video) throw new IllegalArgumentException("仅支持 JPG、PNG、WEBP、GIF、MP4、WEBM、MOV 文件");
    if (file.getSize() > (video ? MEDIA_LIMIT : IMAGE_LIMIT)) throw new IllegalArgumentException(video ? "视频不能超过 100MB" : "图片不能超过 8MB");
    String name = "upload-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + (extension.equals("jpeg") ? "jpg" : extension);
    Path target = safeTarget(name);
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return Map.of("url", "uploads/" + name, "type", video ? "video" : "image", "size", file.getSize());
  }

  @PostMapping("/upload")
  public Map<String, String> uploadImage(@RequestBody Map<String, Object> body) throws IOException {
    Matcher match = DATA_IMAGE.matcher(String.valueOf(body.getOrDefault("data", "")));
    if (!match.matches()) throw new IllegalArgumentException("请选择 PNG、JPG、WEBP 或 GIF 图片");
    byte[] bytes;
    try { bytes = Base64.getDecoder().decode(match.group(2)); }
    catch (IllegalArgumentException error) { throw new IllegalArgumentException("图片数据无效"); }
    if (bytes.length > IMAGE_LIMIT) throw new IllegalArgumentException("图片不能超过 8MB");
    String extension = match.group(1).equals("jpeg") ? "jpg" : match.group(1);
    String name = "upload-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + extension;
    Files.write(safeTarget(name), bytes);
    return Map.of("url", "uploads/" + name);
  }

  private Path safeTarget(String name) {
    Path target = uploadDirectory.resolve(name).normalize();
    if (!target.startsWith(uploadDirectory)) throw new IllegalArgumentException("文件名无效");
    return target;
  }

  private static String extension(String filename) {
    String value = String.valueOf(filename).toLowerCase(Locale.ROOT);
    int dot = value.lastIndexOf('.');
    return dot < 0 ? "" : value.substring(dot + 1);
  }
}

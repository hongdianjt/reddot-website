package com.reddotchip.website;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RedDotApplication {
  public static void main(String[] args) {
    loadDotEnv(List.of(Path.of(".env"), Path.of("../.env")));
    SpringApplication.run(RedDotApplication.class, args);
  }

  private static void loadDotEnv(List<Path> candidates) {
    for (Path path : candidates) {
      if (!Files.isRegularFile(path)) continue;
      try {
        for (String raw : Files.readAllLines(path)) {
          String line = raw.trim();
          if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) continue;
          int split = line.indexOf('=');
          String key = line.substring(0, split).trim();
          String value = line.substring(split + 1).trim();
          if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.substring(1, value.length() - 1);
          if (System.getenv(key) == null && System.getProperty(key) == null) System.setProperty(key, value);
        }
        return;
      } catch (IOException error) {
        throw new IllegalStateException("Unable to read environment file: " + path, error);
      }
    }
  }
}

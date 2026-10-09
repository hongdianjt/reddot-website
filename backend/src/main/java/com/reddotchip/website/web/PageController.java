package com.reddotchip.website.web;

import java.net.URI;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
  private final Path webRoot;
  public PageController(@Value("${app.web-root}") String webRoot) { this.webRoot = Path.of(webRoot).toAbsolutePath().normalize(); }

  @GetMapping("/") public ResponseEntity<Resource> home() { return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(new FileSystemResource(webRoot.resolve("index.html"))); }
  @GetMapping("/admin") public ResponseEntity<Void> adminRedirect() {
    return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY).location(URI.create("/admin/")).build();
  }
  @GetMapping("/admin/") public ResponseEntity<Resource> admin() { return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(new FileSystemResource(webRoot.resolve("admin/index.html"))); }
}

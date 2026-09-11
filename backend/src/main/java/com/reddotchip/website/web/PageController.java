package com.reddotchip.website.web;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
  private final Path webRoot;
  public PageController(@Value("${app.web-root}") String webRoot) { this.webRoot = Path.of(webRoot).toAbsolutePath().normalize(); }

  @GetMapping("/") public ResponseEntity<Resource> home() { return ResponseEntity.ok(new FileSystemResource(webRoot.resolve("index.html"))); }
  @GetMapping({"/admin", "/admin/"}) public ResponseEntity<Resource> admin() { return ResponseEntity.ok(new FileSystemResource(webRoot.resolve("admin/index.html"))); }
}

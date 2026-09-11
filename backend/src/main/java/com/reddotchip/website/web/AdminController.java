package com.reddotchip.website.web;

import com.reddotchip.website.service.AuthService;
import com.reddotchip.website.service.SiteService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final SiteService siteService;
  private final AuthService authService;
  public AdminController(SiteService siteService, AuthService authService) { this.siteService = siteService; this.authService = authService; }

  @PostMapping("/login")
  public Map<String, String> login(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    String username = String.valueOf(body.getOrDefault("username", ""));
    String password = String.valueOf(body.getOrDefault("password", ""));
    if (username.length() > 128 || password.length() > 512) throw new AuthService.InvalidCredentialsException();
    return Map.of("token", authService.login(username, password, clientKey(request)));
  }

  @GetMapping("/site") public Map<String, Object> site() { return siteService.site(); }
  @PutMapping("/settings") public Map<String, Object> settings(@RequestBody Map<String, Object> values) { return siteService.updateSettings(values); }

  @PutMapping("/{collection}")
  public Object collection(@PathVariable String collection, @RequestBody List<Map<String, Object>> values) {
    return collection.equals("distribution") ? siteService.replaceDistribution(values) : siteService.replaceCollection(collection, values);
  }

  @PostMapping("/reset")
  public ResponseEntity<Map<String, String>> reset() { siteService.reset(); return ResponseEntity.ok(Map.of("message", "已恢复默认演示数据")); }

  private static String clientKey(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    String address = forwarded == null || forwarded.isBlank() ? request.getRemoteAddr() : forwarded.split(",", 2)[0].trim();
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(address.getBytes(StandardCharsets.UTF_8))).substring(0, 64); }
    catch (Exception error) { throw new IllegalStateException(error); }
  }
}

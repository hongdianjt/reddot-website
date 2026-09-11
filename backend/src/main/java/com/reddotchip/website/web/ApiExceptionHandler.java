package com.reddotchip.website.web;

import com.reddotchip.website.service.AuthService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(AuthService.InvalidCredentialsException.class)
  ResponseEntity<Map<String, String>> invalidCredentials() { return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "账号或密码错误")); }

  @ExceptionHandler(AuthService.TooManyAttemptsException.class)
  ResponseEntity<Map<String, String>> tooManyAttempts() { return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "登录尝试过于频繁，请 15 分钟后再试")); }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<Map<String, String>> invalidInput(IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<Map<String, String>> uploadTooLarge() { return ResponseEntity.badRequest().body(Map.of("message", "文件大小超过 100MB 限制")); }
}

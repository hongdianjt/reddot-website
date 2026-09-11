package com.reddotchip.website.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reddotchip.website.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(20)
public class AdminAuthFilter extends OncePerRequestFilter {
  private final AuthService auth;
  private final ObjectMapper mapper;

  public AdminAuthFilter(AuthService auth, ObjectMapper mapper) { this.auth = auth; this.mapper = mapper; }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !path.startsWith("/api/admin/") || path.equals("/api/admin/login");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
    if (auth.valid(request.getHeader("x-admin-token"))) { chain.doFilter(request, response); return; }
    response.setStatus(401);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    mapper.writeValue(response.getOutputStream(), Map.of("message", "未登录或会话已失效"));
  }
}

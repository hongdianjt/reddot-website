package com.reddotchip.website.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(1)
public class SecurityHeadersFilter extends OncePerRequestFilter {
  private static final Set<String> BLOCKED_FILES = Set.of("/server.js", "/package.json", "/package-lock.json", "/ecosystem.config.cjs", "/.env", "/.env.example");
  private static final Set<String> BLOCKED_PREFIXES = Set.of("/data/", "/node_modules/", "/deploy/", "/design/", "/backend/", "/.git/", "/previews/");

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
    String path = request.getRequestURI();
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (BLOCKED_FILES.contains(path) || BLOCKED_PREFIXES.stream().anyMatch(path::startsWith)) { response.sendError(404); return; }
    chain.doFilter(request, response);
  }
}

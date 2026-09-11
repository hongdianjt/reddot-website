package com.reddotchip.website.service;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private static final Duration SESSION_DURATION = Duration.ofHours(8);
  private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
  private static final int MAX_ATTEMPTS = 5;
  private final JdbcTemplate jdbc;
  private final String username;
  private final String passwordHash;

  public AuthService(JdbcTemplate jdbc, @Value("${app.admin.username}") String username, @Value("${app.admin.password-hash}") String passwordHash) {
    this.jdbc = jdbc;
    this.username = username;
    this.passwordHash = passwordHash;
  }

  @PostConstruct
  void validateConfiguration() {
    if (username == null || username.isBlank() || passwordHash == null || passwordHash.isBlank()) throw new IllegalStateException("缺少 ADMIN_USERNAME 或 ADMIN_PASSWORD_HASH");
  }

  @Transactional
  public String login(String suppliedUsername, String suppliedPassword, String clientKey) {
    Instant now = Instant.now();
    Map<String, Object> attempt = jdbc.query("SELECT window_started,attempt_count,blocked_until FROM login_attempt WHERE client_key=?", rs -> rs.next() ? Map.of(
      "started", rs.getTimestamp("window_started").toInstant(),
      "count", rs.getInt("attempt_count"),
      "blocked", rs.getTimestamp("blocked_until") == null ? Instant.EPOCH : rs.getTimestamp("blocked_until").toInstant()
    ) : null, clientKey);
    if (attempt != null && ((Instant) attempt.get("blocked")).isAfter(now)) throw new TooManyAttemptsException();
    if (!username.equals(suppliedUsername) || !verifyPassword(suppliedPassword)) {
      recordFailure(clientKey, attempt, now);
      throw new InvalidCredentialsException();
    }
    jdbc.update("DELETE FROM login_attempt WHERE client_key=?", clientKey);
    jdbc.update("DELETE FROM admin_session WHERE expires_at < ?", Timestamp.from(now));
    String token = UUID.randomUUID() + "." + UUID.randomUUID();
    jdbc.update("INSERT INTO admin_session(token_hash,expires_at) VALUES (?,?)", sha256(token), Timestamp.from(now.plus(SESSION_DURATION)));
    return token;
  }

  public boolean valid(String token) {
    if (token == null || token.isBlank()) return false;
    Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM admin_session WHERE token_hash=? AND expires_at>?", Integer.class, sha256(token), Timestamp.from(Instant.now()));
    return count != null && count > 0;
  }

  private void recordFailure(String clientKey, Map<String, Object> attempt, Instant now) {
    Instant started = attempt == null ? now : (Instant) attempt.get("started");
    int count = attempt == null || started.plus(LOGIN_WINDOW).isBefore(now) ? 1 : ((Integer) attempt.get("count")) + 1;
    if (started.plus(LOGIN_WINDOW).isBefore(now)) started = now;
    Instant blockedUntil = count >= MAX_ATTEMPTS ? now.plus(LOGIN_WINDOW) : null;
    jdbc.update("""
      INSERT INTO login_attempt(client_key,window_started,attempt_count,blocked_until) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE window_started=VALUES(window_started),attempt_count=VALUES(attempt_count),blocked_until=VALUES(blocked_until)
      """, clientKey, Timestamp.from(started), count, blockedUntil == null ? null : Timestamp.from(blockedUntil));
  }

  private boolean verifyPassword(String password) {
    try {
      String[] parts = passwordHash.split(":", 3);
      if (parts.length != 3 || !parts[0].equals("scrypt")) return false;
      byte[] expected = HexFormat.of().parseHex(parts[2]);
      byte[] actual = SCrypt.generate(String.valueOf(password).getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8), 16384, 8, 1, expected.length);
      return MessageDigest.isEqual(expected, actual);
    } catch (RuntimeException error) {
      return false;
    }
  }

  private static String sha256(String value) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (Exception error) { throw new IllegalStateException(error); }
  }

  public static final class InvalidCredentialsException extends RuntimeException {}
  public static final class TooManyAttemptsException extends RuntimeException {}
}

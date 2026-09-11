package com.reddotchip.website.repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SiteRepository {
  public static final Set<String> COLLECTIONS = Set.of("solutions", "news", "brands", "platforms");
  private final JdbcTemplate jdbc;

  public SiteRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean isEmpty() {
    Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM site_setting", Integer.class);
    return count == null || count == 0;
  }

  public Map<String, Object> settings() {
    Map<String, Object> result = new LinkedHashMap<>();
    jdbc.queryForList("SELECT setting_key, setting_value FROM site_setting ORDER BY setting_key").forEach(row -> result.put(String.valueOf(row.get("setting_key")), String.valueOf(row.get("setting_value"))));
    return result;
  }

  @Transactional
  public Map<String, Object> updateSettings(Map<String, Object> values) {
    values.forEach((key, value) -> jdbc.update(
      "INSERT INTO site_setting(setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      key, value == null ? "" : String.valueOf(value)
    ));
    return settings();
  }

  public List<List<String>> capabilities() {
    return jdbc.query("SELECT step_no,title,description,keywords FROM capability ORDER BY sort_order,id", (rs, row) -> List.of(
      rs.getString("step_no"), rs.getString("title"), rs.getString("description"), rs.getString("keywords")
    ));
  }

  public List<Map<String, Object>> content(String type) {
    if (!COLLECTIONS.contains(type)) throw new IllegalArgumentException("Unknown collection");
    return jdbc.query("SELECT * FROM content_item WHERE content_type=? ORDER BY sort_order, created_at", this::contentRow, type);
  }

  private Map<String, Object> contentRow(ResultSet rs, int row) throws SQLException {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", rs.getString("id"));
    put(item, "title", rs.getString("title"));
    put(item, "subtitle", rs.getString("subtitle"));
    put(item, "category", rs.getString("category"));
    put(item, "code", rs.getString("code"));
    put(item, "name", rs.getString("name"));
    put(item, "attribute", rs.getString("attribute_name"));
    put(item, "type", rs.getString("platform_type"));
    put(item, "city", rs.getString("city"));
    put(item, "province", rs.getString("province"));
    put(item, "comment", rs.getString("comment_text"));
    put(item, "image", rs.getString("image"));
    put(item, "content", rs.getString("content_html"));
    put(item, "layout", rs.getString("layout_name"));
    Date date = rs.getDate("publish_date");
    if (date != null) item.put("date", date.toLocalDate().toString());
    item.put("enabled", rs.getBoolean("enabled"));
    return item;
  }

  @Transactional
  public List<Map<String, Object>> replaceContent(String type, List<Map<String, Object>> items) {
    if (!COLLECTIONS.contains(type)) throw new IllegalArgumentException("Unknown collection");
    jdbc.update("DELETE FROM content_item WHERE content_type=?", type);
    int order = 0;
    for (Map<String, Object> item : items) {
      jdbc.update("""
        INSERT INTO content_item(id,content_type,title,subtitle,category,code,name,attribute_name,platform_type,city,province,comment_text,image,content_html,layout_name,publish_date,enabled,sort_order)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        text(item, "id"), type, nullable(item, "title"), nullable(item, "subtitle"), nullable(item, "category"), nullable(item, "code"),
        nullable(item, "name"), nullable(item, "attribute"), nullable(item, "type"), nullable(item, "city"), nullable(item, "province"),
        nullable(item, "comment"), nullable(item, "image"), nullable(item, "content"), nullable(item, "layout"), date(item.get("date")),
        bool(item.get("enabled"), true), order++
      );
    }
    return content(type);
  }

  public List<Map<String, Object>> distribution() {
    List<Map<String, Object>> cities = jdbc.query("SELECT * FROM distribution_city ORDER BY sort_order,name", (rs, row) -> {
      Map<String, Object> city = new LinkedHashMap<>();
      city.put("id", rs.getString("id"));
      city.put("name", rs.getString("name"));
      put(city, "province", rs.getString("province"));
      city.put("level", rs.getString("level_name"));
      BigDecimal longitude = rs.getBigDecimal("longitude"), latitude = rs.getBigDecimal("latitude");
      if (longitude != null) city.put("longitude", longitude.doubleValue());
      if (latitude != null) city.put("latitude", latitude.doubleValue());
      city.put("enabled", rs.getBoolean("enabled"));
      city.put("companies", new ArrayList<Map<String, Object>>());
      return city;
    });
    Map<String, Map<String, Object>> byId = new LinkedHashMap<>();
    cities.forEach(city -> byId.put(String.valueOf(city.get("id")), city));
    jdbc.query("SELECT * FROM company ORDER BY city_id,sort_order,name", rs -> {
      Map<String, Object> city = byId.get(rs.getString("city_id"));
      if (city == null) return;
      Map<String, Object> company = new LinkedHashMap<>();
      company.put("id", rs.getString("id"));
      company.put("name", rs.getString("name"));
      company.put("attribute", rs.getString("attribute_name"));
      company.put("type", rs.getString("platform_type"));
      put(company, "comment", rs.getString("comment_text"));
      put(company, "description", rs.getString("description_text"));
      company.put("enabled", rs.getBoolean("enabled"));
      @SuppressWarnings("unchecked") List<Map<String, Object>> companies = (List<Map<String, Object>>) city.get("companies");
      companies.add(company);
    });
    return cities;
  }

  @Transactional
  public List<Map<String, Object>> replaceDistribution(List<Map<String, Object>> cities) {
    jdbc.update("DELETE FROM company");
    jdbc.update("DELETE FROM distribution_city");
    int cityOrder = 0;
    for (Map<String, Object> city : cities) {
      String cityId = text(city, "id");
      jdbc.update("INSERT INTO distribution_city(id,name,province,level_name,longitude,latitude,enabled,sort_order) VALUES (?,?,?,?,?,?,?,?)",
        cityId, text(city, "name"), nullable(city, "province"), value(city, "level", "city"), decimal(city.get("longitude")), decimal(city.get("latitude")), bool(city.get("enabled"), true), cityOrder++);
      Object rawCompanies = city.get("companies");
      if (!(rawCompanies instanceof List<?> companies)) continue;
      int companyOrder = 0;
      for (Object rawCompany : companies) {
        if (!(rawCompany instanceof Map<?, ?> source)) continue;
        Map<String, Object> company = new LinkedHashMap<>();
        source.forEach((key, val) -> company.put(String.valueOf(key), val));
        jdbc.update("INSERT INTO company(id,city_id,name,attribute_name,platform_type,comment_text,description_text,enabled,sort_order) VALUES (?,?,?,?,?,?,?,?,?)",
          text(company, "id"), cityId, text(company, "name"), value(company, "attribute", "子公司"), text(company, "type"), nullable(company, "comment"), nullable(company, "description"), bool(company.get("enabled"), true), companyOrder++);
      }
    }
    return distribution();
  }

  @Transactional
  public void replaceCapabilities(List<?> items) {
    jdbc.update("DELETE FROM capability");
    int order = 0;
    for (Object raw : items) {
      if (!(raw instanceof List<?> item) || item.size() < 3) continue;
      jdbc.update("INSERT INTO capability(step_no,title,description,keywords,sort_order) VALUES (?,?,?,?,?)",
        String.valueOf(item.get(0)), String.valueOf(item.get(1)), String.valueOf(item.get(2)), item.size() > 3 ? String.valueOf(item.get(3)) : "", order++);
    }
  }

  @Transactional
  public void clearAllContent() {
    jdbc.update("DELETE FROM company");
    jdbc.update("DELETE FROM distribution_city");
    jdbc.update("DELETE FROM content_item");
    jdbc.update("DELETE FROM capability");
    jdbc.update("DELETE FROM site_setting");
  }

  private static void put(Map<String, Object> target, String key, String value) { if (value != null) target.put(key, value); }
  private static String text(Map<String, Object> map, String key) {
    String value = nullable(map, key);
    if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
    return value;
  }
  private static String value(Map<String, Object> map, String key, String fallback) { String value = nullable(map, key); return value == null ? fallback : value; }
  private static String nullable(Map<String, Object> map, String key) { Object value = map.get(key); return value == null ? null : String.valueOf(value); }
  private static boolean bool(Object value, boolean fallback) { return value == null ? fallback : value instanceof Boolean flag ? flag : Boolean.parseBoolean(String.valueOf(value)); }
  private static BigDecimal decimal(Object value) { return value == null || String.valueOf(value).isBlank() ? null : new BigDecimal(String.valueOf(value)); }
  private static Date date(Object value) { return value == null || String.valueOf(value).isBlank() ? null : Date.valueOf(LocalDate.parse(String.valueOf(value))); }
}

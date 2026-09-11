package com.reddotchip.website.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reddotchip.website.repository.SiteRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteService {
  private static final Set<String> SETTING_KEYS = Set.of(
    "heroTitle", "heroSub", "phone", "contact", "address", "about", "footer", "wechatQrImage",
    "heroMediaType", "heroMediaImage", "heroMediaPoster", "heroMediaExternalUrl",
    "homeAboutMediaType", "homeAboutMediaImage", "homeAboutMediaPoster", "homeAboutMediaExternalUrl",
    "aboutBannerTitle", "aboutBannerSub", "aboutBannerImage", "aboutIntroTitle",
    "aboutMediaType", "aboutMediaImage", "aboutMediaPoster", "aboutMediaCaption"
  );
  private final SiteRepository repository;
  private final ObjectMapper mapper;
  private final Path seedFile;

  public SiteService(SiteRepository repository, ObjectMapper mapper, @Value("${app.seed-file}") String seedFile) {
    this.repository = repository;
    this.mapper = mapper;
    this.seedFile = Path.of(seedFile).toAbsolutePath().normalize();
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void importLegacyDataWhenEmpty() {
    if (!repository.isEmpty()) return;
    replaceEverything(readSeed());
  }

  public Map<String, Object> site() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("settings", repository.settings());
    result.put("capabilities", repository.capabilities());
    for (String collection : List.of("solutions", "platforms", "brands", "news")) result.put(collection, repository.content(collection));
    result.put("distribution", repository.distribution());
    return result;
  }

  public Map<String, Object> updateSettings(Map<String, Object> request) {
    Map<String, Object> accepted = new LinkedHashMap<>();
    request.forEach((key, value) -> {
      if (!SETTING_KEYS.contains(key)) return;
      String text = value == null ? "" : String.valueOf(value).trim();
      if (text.length() > 100_000) throw new IllegalArgumentException("配置内容过长");
      if ((key.equals("heroMediaType") || key.equals("homeAboutMediaType")) && !Set.of("image", "video", "external").contains(text)) throw new IllegalArgumentException("媒体类型无效");
      if (key.endsWith("ExternalUrl") && !text.isEmpty() && !text.matches("(?i)^https?://.+")) throw new IllegalArgumentException("视频地址必须以 http:// 或 https:// 开头");
      accepted.put(key, text);
    });
    return repository.updateSettings(accepted);
  }

  public List<Map<String, Object>> replaceCollection(String collection, List<Map<String, Object>> request) {
    if (!SiteRepository.COLLECTIONS.contains(collection)) throw new IllegalArgumentException("未知内容类型");
    if (request.size() > 2_000) throw new IllegalArgumentException("单次保存的数据过多");
    List<Map<String, Object>> cleaned = request.stream().map(item -> {
      Map<String, Object> copy = new LinkedHashMap<>(item);
      if (copy.containsKey("content")) copy.put("content", sanitizeHtml(copy.get("content")));
      return copy;
    }).toList();
    return repository.replaceContent(collection, cleaned);
  }

  public List<Map<String, Object>> replaceDistribution(List<Map<String, Object>> request) {
    if (request.size() > 500) throw new IllegalArgumentException("城市数量过多");
    return repository.replaceDistribution(request);
  }

  @Transactional
  public void reset() {
    replaceEverything(readSeed());
  }

  @Transactional
  void replaceEverything(Map<String, Object> seed) {
    repository.clearAllContent();
    Object settings = seed.get("settings");
    if (settings instanceof Map<?, ?> source) {
      Map<String, Object> values = new LinkedHashMap<>();
      source.forEach((key, value) -> values.put(String.valueOf(key), value));
      repository.updateSettings(values);
    }
    Object capabilities = seed.get("capabilities");
    if (capabilities instanceof List<?> values) repository.replaceCapabilities(values);
    for (String collection : SiteRepository.COLLECTIONS) {
      Object raw = seed.get(collection);
      repository.replaceContent(collection, normalizeItems(collection, raw));
    }
    Object distribution = seed.get("distribution");
    repository.replaceDistribution(normalizeObjects(distribution));
  }

  private Map<String, Object> readSeed() {
    if (!Files.isRegularFile(seedFile)) return DefaultSiteData.create();
    try {
      return mapper.readValue(seedFile.toFile(), new TypeReference<>() {});
    } catch (IOException error) {
      throw new IllegalStateException("无法读取旧数据文件：" + seedFile, error);
    }
  }

  private static List<Map<String, Object>> normalizeItems(String collection, Object raw) {
    if (!(raw instanceof List<?> values)) return List.of();
    List<Map<String, Object>> result = new ArrayList<>();
    int index = 0;
    for (Object value : values) {
      index++;
      if (value instanceof Map<?, ?> source) {
        Map<String, Object> item = new LinkedHashMap<>();
        source.forEach((key, val) -> item.put(String.valueOf(key), val));
        item.putIfAbsent("id", singular(collection) + "-" + index);
        item.putIfAbsent("enabled", true);
        result.add(item);
      } else if (value instanceof List<?> row) {
        result.add(legacyItem(collection, row, index));
      }
    }
    return result;
  }

  private static List<Map<String, Object>> normalizeObjects(Object raw) {
    if (!(raw instanceof List<?> values)) return List.of();
    List<Map<String, Object>> result = new ArrayList<>();
    for (Object value : values) if (value instanceof Map<?, ?> source) {
      Map<String, Object> item = new LinkedHashMap<>();
      source.forEach((key, val) -> item.put(String.valueOf(key), val));
      Object companies = item.get("companies");
      if (companies instanceof List<?> rows) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        int companyIndex = 0;
        for (Object row : rows) {
          if (row instanceof Map<?, ?> map) {
            Map<String, Object> company = new LinkedHashMap<>();
            map.forEach((key, val) -> company.put(String.valueOf(key), val));
            company.putIfAbsent("id", item.get("id") + "-company-" + (++companyIndex));
            normalized.add(company);
          } else if (row instanceof List<?> list && list.size() >= 2) {
            Map<String, Object> company = new LinkedHashMap<>();
            company.put("id", item.get("id") + "-company-" + (++companyIndex));
            company.put("name", String.valueOf(list.get(0)));
            company.put("type", String.valueOf(list.get(1)));
            company.put("attribute", String.valueOf(list.get(1)).contains("集团") ? "集团" : "子公司");
            normalized.add(company);
          }
        }
        item.put("companies", normalized);
      }
      result.add(item);
    }
    return result;
  }

  private static Map<String, Object> legacyItem(String collection, List<?> row, int index) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", singular(collection) + "-" + index);
    item.put("enabled", true);
    if (collection.equals("solutions")) { item.put("title", at(row, 0)); item.put("subtitle", at(row, 1)); item.put("image", at(row, 2)); item.put("layout", "图文卡片"); }
    if (collection.equals("news")) { item.put("category", at(row, 0)); item.put("title", at(row, 1)); item.put("date", at(row, 2)); item.put("image", at(row, 3)); item.put("layout", "左图右文"); }
    if (collection.equals("brands")) { item.put("name", at(row, 0)); item.put("code", at(row, 1)); item.put("layout", "品牌卡片"); }
    if (collection.equals("platforms")) { item.put("name", at(row, 0)); item.put("type", at(row, 1)); item.put("comment", at(row, 2)); item.put("attribute", "子公司"); }
    return item;
  }

  private static String singular(String collection) { return collection.endsWith("s") ? collection.substring(0, collection.length() - 1) : collection; }
  private static String at(List<?> row, int index) { return row.size() > index && row.get(index) != null ? String.valueOf(row.get(index)) : ""; }
  static String sanitizeHtml(Object html) {
    Safelist safelist = Safelist.relaxed()
      .addTags("h2", "h3", "h4", "s")
      .addAttributes("img", "src", "alt", "width", "height", "loading")
      .addAttributes("a", "target", "rel")
      .addProtocols("img", "src", "http", "https")
      .preserveRelativeLinks(true);
    // Jsoup needs a base URI to validate root-relative paths such as
    // /assets/uploads/example.jpg. preserveRelativeLinks keeps the original path.
    return Jsoup.clean(
      html == null ? "" : String.valueOf(html),
      "https://reddot.invalid/",
      safelist,
      new org.jsoup.nodes.Document.OutputSettings().prettyPrint(false)
    );
  }
}

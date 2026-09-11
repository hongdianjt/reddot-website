package com.reddotchip.website.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class DefaultSiteData {
  private DefaultSiteData() {}

  static Map<String, Object> create() {
    Map<String, Object> site = new LinkedHashMap<>();
    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("heroTitle", "浙江红点创芯科技发展有限公司");
    settings.put("heroSub", "汽车电子产业国产芯片导入风险管理与供应链生态安全服务集团");
    settings.put("heroMediaType", "image"); settings.put("heroMediaImage", "home-hero-vehicle-system-v3.png"); settings.put("heroMediaPoster", "home-hero-vehicle-system-v3.png"); settings.put("heroMediaExternalUrl", "");
    settings.put("homeAboutMediaType", "image"); settings.put("homeAboutMediaImage", "home-about-chip-hd.png"); settings.put("homeAboutMediaPoster", "home-intro-chip-v2.png"); settings.put("homeAboutMediaExternalUrl", "");
    settings.put("about", "红点创芯聚焦汽车电子产业国产芯片导入风险管理与供应链生态安全，连接整车厂、Tier 1、芯片原厂与产业伙伴。");
    settings.put("footer", "红点创芯专注于汽车芯片国产化与车规级产业链能力建设。");
    settings.put("wechatQrImage", "");
    settings.put("phone", "19016956183"); settings.put("contact", "尉丽"); settings.put("address", "浙江省杭州市萧山区盈丰街道欧镁创新城3幢905室");
    settings.put("aboutBannerTitle", "关于我们"); settings.put("aboutBannerSub", "连接国产芯片与汽车应用，让可靠方案走向量产。"); settings.put("aboutBannerImage", "hero-vehicle-network.png"); settings.put("aboutIntroTitle", "让国产化方案，真正走向量产");
    site.put("settings", settings);
    site.put("capabilities", List.of(
      List.of("01", "需求与项目定义", "明确应用场景、功能边界、性能、安全、成本和周期目标。", "项目立项 · 需求澄清 · 风险识别"),
      List.of("02", "方案设计与选型", "完成系统架构、器件选型及国产化替代方案的综合评估。", "系统方案 · 芯片选型 · 技术评审"),
      List.of("03", "软硬件协同开发", "同步推进硬件设计、基础软件、驱动适配与应用功能开发。", "硬件 · AUTOSAR · MCAL/CDD"),
      List.of("04", "集成与测试验证", "开展模块、系统及整车级联调，验证功能、可靠性与安全机制。", "集成调试 · DV验证 · PV验证"),
      List.of("05", "工程化与试生产", "完成样件迭代、工艺验证、质量控制及小批量试生产。", "量产准备 · 工艺验证 · PPAP"),
      List.of("06", "量产交付与持续支持", "保障供应、质量与版本一致性，持续支持量产问题与产品迭代。", "SOP · 供应保障 · 生命周期服务")
    ));
    site.put("solutions", List.of(
      item("solution-1", "title", "国产车规芯片导入", "subtitle", "从需求评估到量产供货，降低国产化导入风险。", "image", "hero-chip-city.png", "layout", "图文卡片"),
      item("solution-2", "title", "整车热管理", "subtitle", "面向压缩机、水泵、风扇等热管理控制场景。", "image", "hero-vehicle-network.png", "layout", "图文卡片"),
      item("solution-3", "title", "汽车照明", "subtitle", "围绕 LED 驱动、控制与智能照明方案展开。", "image", "hero-data-matrix.png", "layout", "图文卡片")
    ));
    site.put("news", List.of(item("news-1", "category", "公司动态", "title", "红点创芯与生态伙伴共建车规芯片供应协同能力", "date", "2026-08-20", "image", "hero-wafer-portal.png", "layout", "左图右文")));
    site.put("brands", List.of()); site.put("platforms", List.of());
    site.put("distribution", List.of(
      city("hangzhou", "杭州", "浙江省", 120.1551, 30.2741, List.of(company("hz-group", "浙江红点创芯科技发展有限公司", "集团", "集团中台"), company("hz-smart", "浙江红点智芯科技有限公司", "子公司", "前端销售平台"), company("hz-drive", "浙江红点传动科技有限公司", "子公司", "前端销售平台"), company("hz-software", "杭州红点创芯软件技术有限公司", "子公司", "AUTOSAR 软件平台"))),
      city("beijing", "北京", "北京市", 116.4074, 39.9042, List.of(company("bj-huajun", "华峻科技（北京）有限公司", "子公司", "方案解决平台"))),
      city("anhui", "安徽", "安徽省", 117.2830, 31.8612, List.of(company("ah-xiyouxin", "安徽兮有芯科技有限公司", "子公司", "前端销售平台")))
    ));
    return site;
  }

  private static Map<String, Object> item(String id, Object... pairs) { Map<String, Object> item = map(pairs); item.put("id", id); item.put("enabled", true); return item; }
  private static Map<String, Object> company(String id, String name, String attribute, String type) { return item(id, "name", name, "attribute", attribute, "type", type, "comment", "", "description", ""); }
  private static Map<String, Object> city(String id, String name, String province, double longitude, double latitude, List<Map<String, Object>> companies) { return item(id, "name", name, "province", province, "level", "city", "longitude", longitude, "latitude", latitude, "companies", companies); }
  private static Map<String, Object> map(Object... pairs) { Map<String, Object> result = new LinkedHashMap<>(); for (int index = 0; index < pairs.length; index += 2) result.put(String.valueOf(pairs[index]), pairs[index + 1]); return result; }
}

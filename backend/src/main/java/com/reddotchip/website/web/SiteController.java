package com.reddotchip.website.web;

import com.reddotchip.website.service.SiteService;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class SiteController {
  private final SiteService siteService;
  public SiteController(SiteService siteService) { this.siteService = siteService; }

  @GetMapping("/site")
  public ResponseEntity<Map<String, Object>> site() {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(siteService.site());
  }
}

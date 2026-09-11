package com.reddotchip.website.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final String rootLocation;
  private final String assetLocation;
  private final String adminLocation;

  public WebConfig(@Value("${app.web-root}") String webRoot) {
    Path root = Path.of(webRoot).toAbsolutePath().normalize();
    this.rootLocation = root.toUri().toString();
    this.assetLocation = root.resolve("assets").toUri().toString();
    this.adminLocation = root.resolve("admin").toUri().toString();
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/*.html")
      .addResourceLocations(rootLocation).setCacheControl(CacheControl.noStore()).resourceChain(true);
    registry.addResourceHandler("/*.css", "/*.js")
      .addResourceLocations(rootLocation).setCachePeriod(3600).resourceChain(true);
    registry.addResourceHandler("/assets/**")
      .addResourceLocations(assetLocation).setCachePeriod(3600).resourceChain(true);
    registry.addResourceHandler("/admin/**")
      .addResourceLocations(adminLocation).setCachePeriod(3600).resourceChain(true);
  }
}

package com.reddotchip.website.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SiteServiceTest {
  @Test
  void keepsUploadedImageSourceInRichText() {
    String html = "<p>正文</p><img src=\"/assets/uploads/example.jpg\" alt=\"正文图片\" loading=\"lazy\">";

    assertThat(SiteService.sanitizeHtml(html))
      .contains("src=\"/assets/uploads/example.jpg\"")
      .contains("alt=\"正文图片\"");
  }

  @Test
  void removesUnsafeImageProtocols() {
    String html = "<img src=\"javascript:alert(1)\" alt=\"正文图片\">";

    assertThat(SiteService.sanitizeHtml(html))
      .doesNotContain("javascript:")
      .contains("alt=\"正文图片\"");
  }
}

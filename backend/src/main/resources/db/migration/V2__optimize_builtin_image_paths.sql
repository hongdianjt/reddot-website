UPDATE site_setting SET setting_value = REPLACE(setting_value, '.png', '.jpg')
WHERE setting_value IN (
  'hero-chip-city.png', 'hero-data-matrix.png', 'hero-wafer-portal.png',
  'home-about-chip-hd.png', 'home-mission-cockpit-chip-v2.png',
  'home-mission-cockpit-chip-hd.png', 'home-hero-vehicle-system-v3.png',
  'home-hero-chip-red-v2.png', 'hero-vehicle-network.png', 'home-intro-chip-v2.png'
);

UPDATE content_item SET image = REPLACE(image, '.png', '.jpg')
WHERE image IN (
  'hero-chip-city.png', 'hero-data-matrix.png', 'hero-wafer-portal.png',
  'home-about-chip-hd.png', 'home-mission-cockpit-chip-v2.png',
  'home-mission-cockpit-chip-hd.png', 'home-hero-vehicle-system-v3.png',
  'home-hero-chip-red-v2.png', 'hero-vehicle-network.png', 'home-intro-chip-v2.png'
);

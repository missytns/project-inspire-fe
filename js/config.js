(function () {
  const LOCAL_STRAPI = "http://localhost:1337";
  const CLOUD_STRAPI = "https://uplifting-cheese-44a7f505da.strapiapp.com";

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  window.API_BASE_URL = isLocal ? LOCAL_STRAPI : CLOUD_STRAPI;
})();

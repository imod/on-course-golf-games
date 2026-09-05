import Toybox.Lang;
import Toybox.Test;
import Toybox.Application.Properties;

//! baseUrl() strips a single trailing slash, so a configured value like
//! "https://example.com/" doesn't concatenate into a double slash against
//! the leading slash on every request path (which the server 404s on).
(:test)
function apiClientBaseUrlStripsTrailingSlash(logger as Test.Logger) as Boolean {
    Properties.setValue("apiBaseUrl", "https://example.com/");
    var result = ApiClient.baseUrl();
    logger.debug("result = " + result);
    return result != null && (result as String).equals("https://example.com");
}

//! A base URL with no trailing slash is returned unchanged.
(:test)
function apiClientBaseUrlLeavesNoTrailingSlashAlone(logger as Test.Logger) as Boolean {
    Properties.setValue("apiBaseUrl", "https://example.com");
    var result = ApiClient.baseUrl();
    logger.debug("result = " + result);
    return result != null && (result as String).equals("https://example.com");
}

//! An empty configured value still means "not configured" — null, not "".
(:test)
function apiClientBaseUrlEmptyStringIsNull(logger as Test.Logger) as Boolean {
    Properties.setValue("apiBaseUrl", "");
    var result = ApiClient.baseUrl();
    logger.debug("result = " + result);
    return result == null;
}

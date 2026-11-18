package com.facadepm.app;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
public class MainActivity extends Activity {
  static final String URL = "https://avadhrajbhar734-star.github.io/facade-pm-app/";
  WebView w;
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    w = new WebView(this);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    w.setWebViewClient(new WebViewClient() {
      @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
        if (r.isForMainFrame()) v.loadUrl("file:///android_asset/offline.html");
      }
    });
    setContentView(w);
    if (b != null) w.restoreState(b); else w.loadUrl(URL);
  }
  @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); w.saveState(o); }
  @Override public void onBackPressed() { if (w.canGoBack()) w.goBack(); else super.onBackPressed(); }
}

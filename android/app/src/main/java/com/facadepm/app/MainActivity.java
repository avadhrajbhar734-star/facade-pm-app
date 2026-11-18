package com.facadepm.app;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.print.*;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.*;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.*;

/* Thin wrapper: live web app load karta hai. Koi background service / alarm / wake lock nahi. */
public class MainActivity extends Activity {
  static final String URL = "https://avadhrajbhar734-star.github.io/facade-pm-app/";
  static final String HOST = "avadhrajbhar734-star.github.io";
  WebView w; ValueCallback<Uri[]> fileCb;

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    w = new WebView(this);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    w.addJavascriptInterface(new Bridge(), "Android");
    w.setWebViewClient(new WebViewClient() {
      @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
        if (r.isForMainFrame()) v.loadUrl("file:///android_asset/offline.html");
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri u = r.getUrl();
        if (HOST.equals(u.getHost()) || "file".equals(u.getScheme())) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ex) { toast("App nahi mila"); }
        return true;
      }
    });
    w.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (fileCb != null) fileCb.onReceiveValue(null);
        fileCb = cb;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        try { startActivityForResult(Intent.createChooser(i, "Backup file chuno"), 7); } catch (Exception e) { fileCb = null; return false; }
        return true;
      }
    });
    setContentView(w);
    if (b != null) w.restoreState(b); else w.loadUrl(URL);
  }
  @Override protected void onActivityResult(int req, int res, Intent data) {
    if (req == 7 && fileCb != null) {
      fileCb.onReceiveValue(res == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
      fileCb = null;
    } else super.onActivityResult(req, res, data);
  }
  @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); w.saveState(o); }
  @Override public void onBackPressed() { if (w.canGoBack()) w.goBack(); else super.onBackPressed(); }
  void toast(String m) { runOnUiThread(() -> Toast.makeText(this, m, Toast.LENGTH_LONG).show()); }
  boolean trusted() { String u = w.getUrl(); return u != null && (u.startsWith(URL) || u.startsWith("file:///android_asset/")); }

  class Bridge {
    @JavascriptInterface public void saveFile(String name, String b64, String mime) {
      runOnUiThread(() -> {
        if (!trusted()) return;
        try {
          byte[] data = Base64.decode(b64, Base64.DEFAULT);
          String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
          String where = "";
          if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe); cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (u != null) { try (OutputStream os = getContentResolver().openOutputStream(u)) { os.write(data); } where = "Downloads me save: " + safe + ". "; }
          }
          File dir = new File(getCacheDir(), "exports"); dir.mkdirs();
          File f = new File(dir, safe);
          try (FileOutputStream fo = new FileOutputStream(f)) { fo.write(data); }
          Uri cu = FileProvider.getUriForFile(MainActivity.this, "com.facadepm.app.files", f);
          Intent sh = new Intent(Intent.ACTION_SEND); sh.setType(mime); sh.putExtra(Intent.EXTRA_STREAM, cu);
          sh.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
          startActivity(Intent.createChooser(sh, "File bhejo / save karo"));
          toast(where + "Share se WhatsApp/Drive/Email par bhej sakte ho");
        } catch (Exception e) { toast("File save error: " + e.getMessage()); }
      });
    }
    @JavascriptInterface public void shareText(String subject, String text) {
      runOnUiThread(() -> {
        Intent i = new Intent(Intent.ACTION_SEND); i.setType("text/plain");
        i.putExtra(Intent.EXTRA_SUBJECT, subject); i.putExtra(Intent.EXTRA_TEXT, text);
        startActivity(Intent.createChooser(i, "Share"));
      });
    }
    @JavascriptInterface public void copy(String text) {
      runOnUiThread(() -> ((ClipboardManager) getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Facade PM", text)));
    }
    @JavascriptInterface public void print(String job) {
      runOnUiThread(() -> {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        PrintAttributes at = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build();
        pm.print(job, w.createPrintDocumentAdapter(job), at);
      });
    }
    @JavascriptInterface public void askNotify() {
      runOnUiThread(() -> { if (Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 3); else toast("Notification already allowed"); });
    }
    /* Sirf app open hone par ek baar call hota hai - koi scheduling nahi */
    @JavascriptInterface public void notify(String title, String text) {
      runOnUiThread(() -> {
        try {
          NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
          Notification.Builder nb;
          if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel("due", "Due reminders", NotificationManager.IMPORTANCE_DEFAULT));
            nb = new Notification.Builder(MainActivity.this, "due");
          } else nb = new Notification.Builder(MainActivity.this);
          PendingIntent pi = PendingIntent.getActivity(MainActivity.this, 0, new Intent(MainActivity.this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
          nb.setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title).setContentText(text).setContentIntent(pi).setAutoCancel(true);
          nm.notify(1, nb.build());
        } catch (Exception e) { }
      });
    }
  }
}

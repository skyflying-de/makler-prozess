package de.maklerprozess.app;

import android.text.TextUtils;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Makler-Prozess – HTTP-Zugriff für den Cloud-Abgleich.
 * Schnittstelle wie in der Windows-App: request({method, url, headers, bodyB64}) -> {status, headers, b64}.
 * Unterstützt auch WebDAV-Methoden (PROPFIND, MKCOL, MOVE …), die der Browser-Weg nicht ohne CORS kann.
 */
@CapacitorPlugin(name = "NativeHttp")
public class NativeHttpPlugin extends Plugin {

    private final OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(false)
        .retryOnConnectionFailure(true)
        .build();
    private final ExecutorService pool = Executors.newFixedThreadPool(4);

    @PluginMethod
    public void request(final PluginCall call) {
        final String method = call.getString("method", "GET").toUpperCase(Locale.ROOT);
        final String url = call.getString("url");
        final JSObject headers = call.getObject("headers", new JSObject());
        final String bodyB64 = call.getString("bodyB64");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("Ungültige Adresse");
            return;
        }
        pool.execute(() -> {
            try {
                Request.Builder rb = new Request.Builder().url(url);
                String contentType = null;
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String v = headers.getString(k);
                    if (v == null) continue;
                    String lk = k.toLowerCase(Locale.ROOT);
                    if (lk.equals("content-type")) { contentType = v; continue; }
                    if (lk.equals("content-length") || lk.equals("host")) continue;
                    rb.header(k, v);
                }
                RequestBody body = null;
                byte[] bytes = bodyB64 != null && bodyB64.length() > 0 ? Base64.decode(bodyB64, Base64.DEFAULT) : null;
                MediaType mt = contentType != null ? MediaType.parse(contentType) : null;
                if (bytes != null) body = RequestBody.create(bytes, mt);
                else if (method.equals("POST") || method.equals("PUT") || method.equals("PATCH") || method.equals("PROPPATCH") || method.equals("REPORT")) body = RequestBody.create(new byte[0], mt);
                rb.method(method, body);
                try (Response res = client.newCall(rb.build()).execute()) {
                    JSObject out = new JSObject();
                    out.put("status", res.code());
                    JSObject hdr = new JSObject();
                    for (String name : res.headers().names()) {
                        List<String> vals = res.headers(name);
                        hdr.put(name.toLowerCase(Locale.ROOT), TextUtils.join(", ", vals));
                    }
                    out.put("headers", hdr);
                    ResponseBody rbody = res.body();
                    byte[] data = rbody != null ? rbody.bytes() : new byte[0];
                    out.put("b64", Base64.encodeToString(data, Base64.NO_WRAP));
                    call.resolve(out);
                }
            } catch (Exception e) {
                call.reject("Keine Verbindung: " + e.getMessage(), e);
            }
        });
    }
}

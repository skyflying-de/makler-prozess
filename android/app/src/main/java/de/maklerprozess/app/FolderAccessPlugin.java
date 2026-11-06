package de.maklerprozess.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Makler-Prozess – Ordner-Modus auf Android.
 * Der Nutzer wählt einmalig einen Ordner (z. B. den von FolderSync oder „Autosync for OneDrive“ abgeglichenen Ordner).
 * Die App erhält nur für diesen Ordner eine dauerhafte Berechtigung (Speicherzugriffs-Framework, kein Vollzugriff).
 *
 * pick()                        -> {uri, name}   (leer bei Abbruch)
 * op({op, uri, rel, b64})       -> {data}
 *   test | list (-> [{name, dir, size}]) | read (-> b64 oder fehlt) | write | del | mkdir
 */
@CapacitorPlugin(name = "FolderAccess")
public class FolderAccessPlugin extends Plugin {

    private static final String BIN = "application/octet-stream";
    // Ein Arbeits-Thread: Anlegen/Umbenennen laufen nacheinander, keine Doppel-Dateien „name (1)“
    private final ExecutorService pool = Executors.newSingleThreadExecutor();
    // Cache Ordnerpfad -> Dokument-ID (nur Ordner; Dateien werden immer frisch gesucht)
    private final Map<String, String> dirCache = new ConcurrentHashMap<>();
    // kurzlebiger Cache der Kinderlisten (Ordner-ID -> Liste), damit viele Lesezugriffe nicht jedes Mal den ganzen Ordner abfragen
    private final Map<String, List<Child>> listCache = new ConcurrentHashMap<>();
    private final Map<String, Long> listTime = new ConcurrentHashMap<>();
    private static final long LIST_TTL_MS = 4000;

    static class FolderException extends Exception {
        private static final long serialVersionUID = 1L;
        FolderException(String m) { super(m); }
    }

    static class Child {
        String id; String name; boolean dir; long size;
    }

    /* ---------------- Ordner wählen ---------------- */
    @PluginMethod
    public void pick(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, i, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri tree = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, flags);
        } catch (SecurityException e) {
            call.reject("Für diesen Ordner wurde keine dauerhafte Berechtigung erteilt.");
            return;
        }
        if ((flags & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0) {
            try { getContext().getContentResolver().releasePersistableUriPermission(tree, flags); } catch (Exception ignored) { }
            call.reject("Für diesen Ordner fehlt die Schreibberechtigung.");
            return;
        }
        // frühere Ordner-Freigaben zurückgeben (die App nutzt immer nur einen Ordner; Android begrenzt die Anzahl)
        for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().equals(tree)) continue;
            try {
                getContext().getContentResolver().releasePersistableUriPermission(p.getUri(),
                    (p.isReadPermission() ? Intent.FLAG_GRANT_READ_URI_PERMISSION : 0) | (p.isWritePermission() ? Intent.FLAG_GRANT_WRITE_URI_PERMISSION : 0));
            } catch (Exception ignored) { }
        }
        dirCache.clear();
        listCache.clear();
        final JSObject r = new JSObject();
        r.put("uri", tree.toString());
        String name = null;
        try { name = displayName(tree, DocumentsContract.getTreeDocumentId(tree)); } catch (Exception ignored) { }
        r.put("name", name != null ? name : "Gewählter Ordner");
        call.resolve(r);
    }

    /* ---------------- Dateioperationen ---------------- */
    @PluginMethod
    public void op(final PluginCall call) {
        final String op = call.getString("op", "");
        final String uriS = call.getString("uri");
        final String rel = call.getString("rel", "");
        final String b64 = call.getString("b64");
        if (uriS == null || !uriS.startsWith("content://")) {
            call.reject("Ordner ungültig");
            return;
        }
        pool.execute(() -> {
            try {
                call.resolve(run(op, Uri.parse(uriS), rel, b64));
            } catch (FolderException e) {
                call.reject(e.getMessage());
            } catch (SecurityException e) {
                call.reject("Keine Berechtigung für den Ordner – bitte „Ordner neu wählen“.");
            } catch (Exception e) {
                dirCache.clear();
                listCache.clear();
                // nur lesende Aktionen wiederholen (veralteter Cache-Eintrag, Ordner von der Sync-App neu angelegt);
                // Schreiben/Löschen nicht doppelt ausführen
                if (!(op.equals("list") || op.equals("read") || op.equals("mkdir") || op.equals("test"))) {
                    call.reject("Ordner nicht erreichbar – " + e.getMessage());
                    return;
                }
                try {
                    call.resolve(run(op, Uri.parse(uriS), rel, b64));
                } catch (FolderException e2) {
                    call.reject(e2.getMessage());
                } catch (SecurityException e2) {
                    call.reject("Keine Berechtigung für den Ordner – bitte „Ordner neu wählen“.");
                } catch (Exception e2) {
                    call.reject("Ordner nicht erreichbar – " + e2.getMessage());
                }
            }
        });
    }

    private JSObject run(String op, Uri tree, String rel, String b64) throws Exception {
        if (!hasPermission(tree)) throw new FolderException("Keine Berechtigung für den Ordner – bitte „Ordner neu wählen“.");
        String[] segs = split(rel);
        JSObject res = new JSObject();
        switch (op) {
            case "test": {
                String root = DocumentsContract.getTreeDocumentId(tree);
                Uri probe = DocumentsContract.createDocument(cr(), docUri(tree, root), BIN, ".mp-test-" + System.currentTimeMillis());
                if (probe == null) throw new FolderException("In diesem Ordner kann nicht geschrieben werden.");
                writeBytes(probe, "ok".getBytes("UTF-8"), "w");
                DocumentsContract.deleteDocument(cr(), probe);
                res.put("data", true);
                break;
            }
            case "list": {
                String id = resolveDir(tree, segs, segs.length, false);
                JSArray arr = new JSArray();
                if (id != null) {
                    for (Child c : children(tree, id)) {
                        if (skip(c.name)) continue;
                        JSObject o = new JSObject();
                        o.put("name", c.name);
                        o.put("dir", c.dir);
                        o.put("size", c.size);
                        arr.put(o);
                    }
                }
                res.put("data", arr);
                break;
            }
            case "read": {
                if (segs.length == 0) throw new FolderException("Ungültiger Pfad");
                String parent = resolveDir(tree, segs, segs.length - 1, false);
                Child f = parent == null ? null : find(tree, parent, segs[segs.length - 1]);
                if (f != null && !f.dir) res.put("data", Base64.encodeToString(readBytes(docUri(tree, f.id)), Base64.NO_WRAP));
                break;
            }
            case "write": {
                if (segs.length == 0) throw new FolderException("Ungültiger Pfad");
                byte[] bytes = b64 == null ? new byte[0] : Base64.decode(b64, Base64.DEFAULT);
                String parent = resolveDir(tree, segs, segs.length - 1, true);
                String name = segs[segs.length - 1];
                Child ex = find(tree, parent, name);
                if (ex != null && !ex.dir) {
                    // vorhandene eigene Datei (z. B. Geräteinfo) überschreiben – kein Löschen, damit die Sync-App nichts entfernt
                    writeBytes(docUri(tree, ex.id), bytes, "wt");
                } else {
                    // neue Datei: erst unter Zwischennamen schreiben, dann umbenennen -> niemand liest halbe Dateien
                    String tmpName = "." + name + "." + Long.toHexString(System.nanoTime()) + ".tmp";
                    Uri tmp = DocumentsContract.createDocument(cr(), docUri(tree, parent), BIN, tmpName);
                    if (tmp == null) throw new FolderException("Datei konnte nicht angelegt werden: " + name);
                    boolean renamed = false;
                    try {
                        writeBytes(tmp, bytes, "w");
                        Uri done = null;
                        try { done = DocumentsContract.renameDocument(cr(), tmp, name); } catch (Exception ignored) { }
                        renamed = done != null;
                        if (!renamed) {
                            // Anbieter ohne Umbenennen: direkt anlegen
                            Uri fin = DocumentsContract.createDocument(cr(), docUri(tree, parent), BIN, name);
                            if (fin == null) throw new FolderException("Datei konnte nicht angelegt werden: " + name);
                            writeBytes(fin, bytes, "w");
                        }
                    } finally {
                        // Zwischendatei nie liegen lassen (auch bei vollem Speicher o. Ä.)
                        if (!renamed) { try { DocumentsContract.deleteDocument(cr(), tmp); } catch (Exception ignored) { } }
                    }
                }
                listCache.remove(parent);
                res.put("data", true);
                break;
            }
            case "del": {
                if (segs.length == 0) throw new FolderException("Ungültiger Pfad");
                String parent = resolveDir(tree, segs, segs.length - 1, false);
                Child f = parent == null ? null : find(tree, parent, segs[segs.length - 1]);
                if (f != null) {
                    DocumentsContract.deleteDocument(cr(), docUri(tree, f.id));
                    if (f.dir) dirCache.clear();
                    listCache.remove(parent);
                }
                res.put("data", true);
                break;
            }
            case "mkdir": {
                resolveDir(tree, segs, segs.length, true);
                res.put("data", true);
                break;
            }
            default:
                throw new FolderException("Unbekannte Ordner-Aktion");
        }
        return res;
    }

    /* ---------------- Hilfen ---------------- */
    private ContentResolver cr() { return getContext().getContentResolver(); }

    private static Uri docUri(Uri tree, String id) { return DocumentsContract.buildDocumentUriUsingTree(tree, id); }

    private boolean hasPermission(Uri tree) {
        for (UriPermission p : cr().getPersistedUriPermissions()) {
            if (p.getUri().equals(tree) && p.isWritePermission()) return true;
        }
        return false;
    }

    static String[] split(String rel) throws FolderException {
        List<String> out = new ArrayList<>();
        for (String s : String.valueOf(rel == null ? "" : rel).split("[/\\\\]+")) {
            if (s.isEmpty()) continue;
            if (s.equals(".") || s.equals("..")) throw new FolderException("Ungültiger Pfad");
            out.add(s);
        }
        return out.toArray(new String[0]);
    }

    static boolean skip(String n) {
        if (n == null || n.isEmpty() || n.startsWith(".") || n.startsWith("~$")) return true;
        String l = n.toLowerCase(java.util.Locale.ROOT);
        return l.endsWith(".tmp") || l.endsWith(".partial") || l.endsWith(".crdownload") || l.endsWith(".dl");
    }

    /** Dokument-ID des Ordners aus den ersten n Pfadteilen; legt fehlende Ordner an, wenn create. */
    private String resolveDir(Uri tree, String[] segs, int n, boolean create) throws Exception {
        String id = DocumentsContract.getTreeDocumentId(tree);
        StringBuilder path = new StringBuilder(tree.toString()).append('|');
        for (int i = 0; i < n; i++) {
            path.append('/').append(segs[i]);
            String key = path.toString();
            String cached = dirCache.get(key);
            if (cached != null) { id = cached; continue; }
            Child c = find(tree, id, segs[i]);
            if (c == null || !c.dir) {
                if (!create) return null;
                if (c != null) throw new FolderException("Name belegt: " + segs[i]);
                Uri made = DocumentsContract.createDocument(cr(), docUri(tree, id), DocumentsContract.Document.MIME_TYPE_DIR, segs[i]);
                if (made == null) throw new FolderException("Ordner konnte nicht angelegt werden: " + segs[i]);
                listCache.remove(id);
                id = DocumentsContract.getDocumentId(made);
            } else {
                id = c.id;
            }
            dirCache.put(key, id);
        }
        return id;
    }

    private Child find(Uri tree, String parentId, String name) {
        for (Child c : children(tree, parentId)) if (name.equals(c.name)) return c;
        return null;
    }

    private List<Child> children(Uri tree, String parentId) {
        Long t = listTime.get(parentId);
        List<Child> hit = listCache.get(parentId);
        if (hit != null && t != null && System.currentTimeMillis() - t < LIST_TTL_MS) return hit;
        List<Child> out = new ArrayList<>();
        Uri ch = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] cols = {
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE
        };
        try (Cursor c = cr().query(ch, cols, null, null, null)) {
            if (c == null) return out;
            while (c.moveToNext()) {
                Child x = new Child();
                x.id = c.getString(0);
                x.name = c.getString(1);
                x.dir = DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(2));
                x.size = c.isNull(3) ? 0 : c.getLong(3);
                if (x.name != null) out.add(x);
            }
        }
        listCache.put(parentId, out);
        listTime.put(parentId, System.currentTimeMillis());
        return out;
    }

    private String displayName(Uri tree, String id) {
        try (Cursor c = cr().query(docUri(tree, id), new String[] { DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        }
        return null;
    }

    private byte[] readBytes(Uri u) throws Exception {
        try (InputStream in = cr().openInputStream(u)) {
            if (in == null) throw new FolderException("Datei nicht lesbar");
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int r;
            while ((r = in.read(buf)) > 0) bo.write(buf, 0, r);
            return bo.toByteArray();
        }
    }

    private void writeBytes(Uri u, byte[] bytes, String mode) throws Exception {
        try (OutputStream out = cr().openOutputStream(u, mode)) {
            if (out == null) throw new FolderException("Datei nicht schreibbar");
            out.write(bytes);
            out.flush();
        }
    }
}

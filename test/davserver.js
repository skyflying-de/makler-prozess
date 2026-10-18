// WebDAV-Testserver im Nextcloud-Pfadschema: node test/davserver.js <ordner> <port>
const webdav = require("webdav-server").v2, fs = require("fs");
const dir = process.argv[2], port = +process.argv[3] || 1900;
fs.mkdirSync(dir, { recursive: true });
const um = new webdav.SimpleUserManager(), user = um.addUser("buero", "app-pass-123", false);
const pm = new webdav.SimplePathPrivilegeManager(); pm.setRights(user, "/", ["all"]);
const server = new webdav.WebDAVServer({ port, httpAuthentication: new webdav.HTTPBasicAuthentication(um, "Nextcloud"), privilegeManager: pm, requireAuthentification: true, hostname: "127.0.0.1" });
server.setFileSystem("/remote.php/dav/files/buero", new webdav.PhysicalFileSystem(dir), ok => {
  server.start(() => console.log("DAV bereit " + port));
});

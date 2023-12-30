# Tilda's Tonies 🎵

[tildas-tonies.de](https://tildas-tonies.de) zeigt Verwandtschaft und Freunden, welche Tonies bereits im Besitz sind. Die Seite aktualisiert sich automatisch, wenn neue Tonies auf die Toniebox gestellt und somit zum mytonies Account hinzugefügt werden.

Backend und Frontend werden auf [Cloudflare Workers](https://workers.cloudflare.com/) und [Cloudflare Pages](https://pages.cloudflare.com/) bereitgestellt. Der OIDC Refresh Token des mytonies Accounts wird in [Cloudflare Workers KV](https://developers.cloudflare.com/kv/learning/how-kv-works/) gespeichert. Die Ergebnisse werden eine Stunde gecached, um die mytonies API nicht zu oft abzufragen.

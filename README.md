# Biblioteca Digital de Salud Ambiental de Chile

Creada por **Pablo Aguirre Araya**.

Sitio publicado: https://biblioteca-salud-ambiental-web.pablo-aguirre-araya.workers.dev/

Catálogo curado de clases, seminarios, estudios y documentos sobre salud ambiental en Chile: 178 fichas, casos territoriales y datos de PM2.5 en capitales regionales. Esta es la edición preparada para el Colegio Médico de Chile (COLMED).

## Licencia y cómo citar

- **Contenido y fotografías**: [CC BY 4.0](LICENSE-CONTENIDO.md). Puedes copiar, adaptar y redistribuir, también con fines comerciales, citando al autor e indicando si hiciste cambios.
- **Código**: [Apache 2.0](LICENSE). Las copias y versiones modificadas deben conservar el archivo [`NOTICE`](NOTICE).
- Los recursos enlazados, la tipografía, los íconos, el mapa y los datos SINCA conservan las licencias de sus titulares; ver [`LICENSE-CONTENIDO.md`](LICENSE-CONTENIDO.md).

Atribución sugerida:

> Biblioteca Digital de Salud Ambiental de Chile, por Pablo Aguirre Araya. Licencia CC BY 4.0.

GitHub muestra el botón «Cite this repository» a partir de [`CITATION.cff`](CITATION.cff).

## Cómo se publica

Este repositorio contiene el sitio ya generado. Cada cambio en `main` se publica automáticamente en Cloudflare Workers. No edites estos archivos a mano: se generan desde el repositorio fuente `biblioteca-salud-ambiental` con

```
python -m src.cli generar-sitio --edicion colmed --destino <carpeta-vacía>
```

y luego se copian aquí. Además del sitio interactivo, la generación incluye una página por ficha en `recurso/<id>/`, `sitemap.xml` y `robots.txt` para los buscadores.

Para verlo localmente, sirve esta carpeta como sitio estático (por ejemplo, `python -m http.server`). Los enlaces externos requieren conexión a internet.

# Biblioteca Digital de Salud Ambiental de Chile

[Read in English](README.md) · **Español**

**Un punto de partida público para el conocimiento en salud ambiental de Chile.**

MVP que reúne metadatos y enlaces a clases, seminarios, investigaciones y documentos técnicos. Busca facilitar el acceso a recursos por tema y territorio para estudiantes, profesionales de salud, docentes e investigadores.

[Explorar la Biblioteca pública](https://biblioteca-salud-ambiental-chile-pablo.pablo-aguirre.chatgpt.site) · [Consultar recursos](https://biblioteca-salud-ambiental-chile-pablo.pablo-aguirre.chatgpt.site/#catalogo)

**MVP público.** Esta presentación se limita al sitio y repositorio públicos.

<img src="assets/mobile-overview.webp" alt="Portada de la Biblioteca pública de salud ambiental en una pantalla móvil" width="300">

*Captura móvil real, 390 × 844 píxeles CSS. Interfaz en español.*

## El problema y la experiencia

El material relevante está distribuido entre instituciones y formatos. La Biblioteca ofrece una interfaz común para descubrirlo, manteniendo cada recurso vinculado a su fuente original.

- Buscar por palabras y filtrar por tema, territorio, tipo de recurso e institución.
- Explorar temas, casos territoriales y vistas regionales.
- Leer descripciones y seguir enlaces a las fuentes.
- Recorrer clases, videos, seminarios, investigaciones y documentos técnicos desde móvil o escritorio.

![Búsqueda pública de Arica en el catálogo con filtros y descripción de fuentes](assets/desktop-search.webp)

*Captura de escritorio a 1440 × 900 píxeles CSS. Los conteos corresponden al catálogo público capturado, no garantizan cobertura permanente. [Resultados en móvil](assets/mobile-results.webp).*

## Estado del MVP y contexto institucional

La [nota original del repositorio](docs/overview-before-visual-redesign.md) registra un MVP congelado el 19 de septiembre de 2026 para presentarlo al Colegio Médico. La nota documenta ese contexto; **no** demuestra respaldo institucional, certificación ni aprobación de los recursos.

Este repositorio conserva la versión web pública. El desarrollo interno y los cambios no publicados quedan fuera de esta presentación. Las descripciones y la disponibilidad de las fuentes requieren revisión editorial continua; incluir un recurso no establece su calidad de evidencia ni lo convierte en guía clínica.

## Visualizar localmente

Descarga este repositorio público y abre `index.html` en un navegador moderno, o sirve la carpeta como sitio estático:

```sh
python -m http.server 8000
```

Luego abre `http://localhost:8000`. No requiere compilación. La interfaz pública usa HTML, CSS y JavaScript, con metadatos del catálogo en `catalog.js`. Las fuentes externas y videos necesitan internet y dependen de la disponibilidad y los derechos de sus propietarios.

## Mi aporte

Definición del problema, organización de la experiencia pública de búsqueda y decisiones de interfaz, con desarrollo asistido por IA. **Pablo Aguirre Araya, médico en Chile.**

[Explorar la Biblioteca](https://biblioteca-salud-ambiental-chile-pablo.pablo-aguirre.chatgpt.site) · [Contacto](mailto:pablo.aguirre.araya@gmail.com) · [Detalles de las capturas](docs/screenshots.md)

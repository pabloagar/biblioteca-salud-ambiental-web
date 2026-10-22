# Biblioteca Digital de Salud Ambiental de Chile

**English** · [Leer en español](README.es.md)

**Environmental health knowledge, connected to Chile's territories and original sources.**

A digital library that organizes public lectures, research and technical documents by topic, territory and environmental case. It helps readers find a resource, understand its context and return to the original source.

**Status:** static MVP snapshot frozen on September 19, 2026 for presentation to Colegio Médico, as recorded in the original repository. This is not evidence of institutional endorsement or clinical validation. The published GitHub Pages app was verified during this review; the screenshots come from that live deployment.

[Open the library](https://pabloagar.github.io/biblioteca-salud-ambiental-web/) · [Run locally](#run-locally) · [Explore the catalog data](catalog.js) · [Leer en español](README.es.md)

<picture>
  <source media="(max-width: 600px)" srcset="assets/screenshots/inicio-mobile.webp">
  <img src="assets/screenshots/inicio-desktop.webp" alt="Published Biblioteca MVP: environmental health homepage, search, resource categories and Chilean landscape" width="100%">
</picture>

Actual published app, October 22, 2026. Spanish interface. [Mobile homepage](assets/screenshots/inicio-mobile.webp) · [Catalog screenshot](assets/screenshots/catalogo-desktop.webp) · [Capture provenance](assets/screenshots/README.md).

## The problem

Environmental health material is spread across public agencies, universities and audiovisual platforms. A list of links alone makes it difficult to connect evidence with a place, an exposure or a practical question.

## What you can explore

- Search and filter the catalog by text, topic, format and territory.
- Browse thematic connections, regional profiles and environmental cases.
- Read resource descriptions, attribution and documentary context before following the original source.
- Explore data views with their own sources and limitations.

## Inspectable evidence

The checked-in [application](app.js) and [catalog](catalog.js) are available for inspection. The homepage currently groups resources into classes/videos, seminars/workshops, research/theses and technical documents. These are catalog counts, not audience or impact metrics.

Captures show the homepage and the real catalog in a fresh browser session on GitHub Pages. They demonstrate the interface; they do not certify the completeness, currency or scientific quality of every linked resource. A successful link response does not verify the content behind it.

## My contribution

**Dr. Pablo Aguirre Araya, physician in Arica, Chile.** Concept, editorial structure, information architecture, content organization and platform development, as credited in the app's “Acerca de” section, using an iterative AI-assisted workflow.

The library organizes metadata, context and links. Authorship and rights to the original resources remain with their sources; this repository does not grant rights over third-party material.

## Run locally

Open `index.html` in a browser, or serve this folder with a static HTTP server. For example, with Python 3 installed:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open [localhost:8000](http://127.0.0.1:8000/). No build step or backend is required. External source links require internet access.

## Technology and scope

HTML, CSS and browser JavaScript, with versioned catalog and data assets. This repository preserves the `MVP_2026-09-19_COLMED` snapshot; documentation and new screenshots do not change that application snapshot.

The library is an educational and documentary resource. It does not provide individual exposure assessment, diagnosis or clinical recommendations. Resource availability and currency need periodic review; no comprehensive revalidation of external resources was performed for this portfolio update.

[Contact](mailto:pablo.aguirre.araya@gmail.com)

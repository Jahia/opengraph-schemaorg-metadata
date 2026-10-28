# Structured Data Mapper

Structured Data Mapper is a Jahia module that maps content types to Open Graph types and properties. A site administrator or an editor in chief sets the mapping for `jnt:page`, for the types that inherit `jmix:mainResource`, and for the mixins that extend one of them with `extends=`. A template mapping applies only to the contents of its type that use its template, such as the pages with the template `event`.

One mapping applies to a content: a template mapping for the template of the content first, then the mapping of a mixin of the content, then the mapping of its type or of its closest supertype.

## Tracks

The module has three parts:

- **Mapping screen**: a screen in the Additional accordion of jContent that maps a content type to an Open Graph type.
- **Render filter**: a filter that writes the `og:*` meta tags of the mapping in the head of each page.
- **Content Editor field**: a read-only field in Content Editor that shows the Open Graph values of the node.

## Status

Skeleton, no feature yet. The Open Graph screen shows a placeholder, and the module has no Java code and no node type definitions.

## Permissions

The module adds the permission `structuredDataMapperManage` under the `site-admin` permission group. The `site-administrator` role holds `site-admin`, and the module grants `structuredDataMapperManage` to the `editor-in-chief` role.

## Build

The Maven settings file reads the Nexus credentials from the variables `NEXUS_USERNAME` and `NEXUS_PASSWORD`. Run this command at the repository root:

```bash
mvn -s .github/maven.settings.xml clean install
```

The build runs the Vite build of the UI and writes `target/structured-data-mapper-0.1.0-SNAPSHOT.jar`.

# Structured Data Mapper

Structured Data Mapper is a Jahia module that maps content types to Open Graph types and properties, and to schema.org types and properties. A site administrator or an editor in chief sets the mapping for `jnt:page`, for the types that inherit `jmix:mainResource`, and for the mixins that extend one of them with `extends=`. A template mapping applies only to the contents of its type that use its template, such as the pages with the template `event`.

One mapping applies to a content: a template mapping for the template of the content first, then the mapping of a mixin of the content, then the mapping of its type or of its closest supertype.

## Mapping form

The form of a mapping has one switch for each vocabulary, and both are off for a new mapping:

- **Open Graph**: the properties of every og:type, such as `og:title`, then the og:type, `website` by default, then the properties of that og:type, such as `article:published_time`. When the switch is off, the module writes no `og:*` tag and no `twitter:card` for the contents of the mapping, and it ignores the custom tags of an editor. The Content Editor then says that Open Graph is off, and a social network shows no rich card.
- **schema.org**: the schema.org type, then the properties of that type.

A mapping with both switches off writes nothing, so a template mapping can stop the module on a template that writes its own tags. Several fields of a mapping can name the same source property, such as `jcr:title` for `og:title` and `headline`. The module never fills an empty field of one vocabulary from the other.

## schema.org

A mapping can name one schema.org type: `Article`, `NewsArticle`, `BlogPosting`, `WebPage`, `ProfilePage`, `Product`, `Event`, `Recipe` or `VideoObject`. The administrator then maps content properties to the properties of that type, such as `headline`, `datePublished` or `author.name`. A name with a dot fills a nested entity, such as the `Person` of `author`. The module writes `url` itself, and the first property of each type, such as `headline`, takes the title of the content when it has no source.

The module writes no site-wide type, such as `WebSite`, `Organization` or `BreadcrumbList`.

## Content Editor

The SEO section of the Content Editor shows four fieldsets for a content that a mapping applies to. Each vocabulary shows its values first, then the switch that overrides them:

1. **Open Graph**: the Open Graph tags of the content, then the share card of Facebook, LinkedIn and X.
2. **Override Open Graph tags**: a switch, then one custom tag for each Open Graph property of the og:type of the mapping. A custom tag replaces the mapped values of its property.
3. **schema.org**: the JSON-LD block of the content, as formatted JSON. A content or a file shows as "Live URL of" its path, because its live URL depends on the host of the site.
4. **Override schema.org properties**: a switch, then one custom property for each schema.org property of the type of the mapping, such as `author.name`. A custom property replaces the mapped values of its property, or adds a property that the mapping does not fill. A property with several values, such as `author.name`, takes each value of the editor, and another property takes the first valid value.

The values are those of the edit workspace in the language of the editor, not those of the live page. The Open Graph tags follow a mapped text field while the editor types. The other values show the saved content, so they change after a save. When a vocabulary is switched off in the mapping, its values fieldset says so, and its override fieldset hides. When no mapping applies, or when both vocabularies are off, the module adds no fieldset.

## Tracks

The module has three parts:

- **Mapping screen**: the screen **Structured data**, in the SEO group of the Additional accordion of jContent, that maps a content type to an Open Graph type and to a schema.org type.
- **Render filter**: a filter that writes the `og:*` meta tags of the mapping in the head of each page. When the mapping names a schema.org type, the filter also writes one `<script type="application/ld+json">` block of that type.
- **Content Editor fieldsets**: the read-only values and the overrides of each vocabulary, in the SEO section of the Content Editor.

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

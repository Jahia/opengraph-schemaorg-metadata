package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

import java.util.Arrays;
import java.util.Collection;

@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class OpenGraphSchemaOrgMetadataExtensionsProvider implements DXGraphQLExtensionsProvider {

    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(OpenGraphSchemaOrgMetadataQueryExtension.class, OpenGraphSchemaOrgMetadataNodeExtension.class,
                OpenGraphSchemaOrgMetadataMutationExtension.class);
    }
}

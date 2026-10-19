package org.jahia.pm.modules.veryopengraph.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

import java.util.Arrays;
import java.util.Collection;

@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class VeryOpenGraphExtensionsProvider implements DXGraphQLExtensionsProvider {

    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(VeryOpenGraphQueryExtension.class, VeryOpenGraphNodeExtension.class,
                VeryOpenGraphMutationExtension.class);
    }
}

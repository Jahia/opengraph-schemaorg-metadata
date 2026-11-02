import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

// sdmmix:openGraph and sdmmix:schemaOrg now declare the Open Graph and the schema.org properties that
// sdmnt:typeMapping declared before. A mapping stored before carries these properties without their mixin, so
// this patch adds the mixin of each vocabulary the mapping uses. The mappings live in the default workspace
// only, because sdmnt:settings is jmix:nolive.
SWITCHES = ["sdm:ogType": "sdmmix:openGraph", "sdm:schemaType": "sdmmix:schemaOrg"]

def addSwitchMixins() {
    JCRTemplate.getInstance().doExecuteWithSystemSession(new JCRCallback<Void>() {

        @Override
        Void doInJCR(JCRSessionWrapper session) throws RepositoryException {
            NodeIterator it = session.getWorkspace().getQueryManager()
                    .createQuery("SELECT * FROM [sdmnt:typeMapping]", Query.JCR_SQL2)
                    .execute()
                    .getNodes()

            int changed = 0
            while (it.hasNext()) {
                JCRNodeWrapper node = (JCRNodeWrapper) it.nextNode()
                SWITCHES.each { property, mixin ->
                    // The wrapper hides a property that no definition covers, and the node of the repository does not.
                    if (node.getRealNode().hasProperty(property) && !node.isNodeType(mixin)) {
                        node.addMixin(mixin)
                        changed++
                        log.info("Added ${mixin} to ${node.getPath()}")
                    }
                }
            }

            if (changed > 0) {
                session.save()
            }
            log.info("Added ${changed} switch mixin(s) to the stored mappings.")
            return null
        }
    })
}

addSwitchMixins()

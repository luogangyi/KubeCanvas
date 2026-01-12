/**
 * Kubernetes PersistentVolumeClaim Generator
 * 
 * Generates Kubernetes PVC YAML from form data.
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

export interface PVCForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    storageClassName?: string;
    accessModes: ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany' | 'ReadWriteOncePod')[];
    storage: string;
    volumeName?: string;
    volumeMode?: 'Filesystem' | 'Block';
    selector?: {
        matchLabels?: Record<string, string>;
    };
}

// =========================================
// GENERATOR
// =========================================

export function generatePVC(formData: PVCForm): string {
    const pvc: Record<string, unknown> = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            accessModes: formData.accessModes,
            resources: {
                requests: {
                    storage: formData.storage,
                },
            },
            ...(formData.storageClassName && { storageClassName: formData.storageClassName }),
            ...(formData.volumeName && { volumeName: formData.volumeName }),
            ...(formData.volumeMode && { volumeMode: formData.volumeMode }),
            ...(formData.selector && { selector: formData.selector }),
        },
    };

    return yaml.dump(pvc, { indent: 2, lineWidth: -1, noRefs: true });
}

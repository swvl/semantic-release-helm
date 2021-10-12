const AggregateError = require('aggregate-error');
const execa = require('execa');
const AWS = require('aws-sdk');

module.exports = async (pluginConfig, context) => {
    const errors = [];

    const env = context.env;

    if (!pluginConfig.chartPath) {
        errors.push('Missing argument: chartPath');
    }

    if (pluginConfig.registry && env.REGISTRY_USERNAME && env.REGISTRY_PASSWORD) {
        const registryUrl = pluginConfig.registry;
        try {
            await verifyRegistryLogin(registryUrl, env.REGISTRY_USERNAME, env.REGISTRY_PASSWORD);
        } catch (error) {
            errors.push('Could not login to registry. Wrong USERNAME AND PASSWORD', error);
        }
    } else if (pluginConfig.registry){
        const registryUrl = pluginConfig.registry;
        try {
            await verifyAwsCredentialsKeySecret(registryUrl);
        } catch (error) {
            errors.push('Could not access S3 helm repo.', error);
        } 
    }

    if (pluginConfig.registry && pluginConfig.registry.startsWith('s3://')) {
        try {
            await installHelmS3Plugin();
        } catch (error) {
            // TODO Maybe add better error handling?
            // Do not fail if plugin is already installed
        }
        try {
            await verifyS3Credentials(pluginConfig.registry);
        } catch (error) {
            errors.push('Could not login to S3. Wrong credentials?', error);
        }
    }

    if (errors.length > 0) {
        throw new AggregateError(errors);
    }
};

async function verifyRegistryLogin(registryUrl, registryUsername, registryPassword) {
    await execa(
        'helm',
        ['registry', 'login', '--username', registryUsername, '--password-stdin', registryUrl],
        {
            input: registryPassword,
            env: {
                HELM_EXPERIMENTAL_OCI: 1
            }
        }
    );
}

async function verifyAwsCredentialsKeySecret(registryUrl) {
    var s3 = new AWS.S3();

    BUCKETFULLPATH = registryUrl.split("s3://")[1]

    const Bucket = BUCKETFULLPATH.split("/")[0];
    const Prefix = BUCKETFULLPATH.split("/")[1];
    const MaxKeys = 1; // If a single object is found, the folder exists.
    const params = {
        Bucket,
        Prefix,
        MaxKeys
    };

    var out = await s3.listObjectsV2(params).promise();
    console.log(out.KeyCount)
    if (out.KeyCount == 0){
        throw "AWS S3 folder doesn't exist"
    }
}

async function installHelmS3Plugin() {
    await execa(
        'helm',
        ['plugin', 'install', 'https://github.com/hypnoglow/helm-s3.git']
    );
}

async function verifyS3Credentials(registryUrl) {
    await execa(
        'helm',
        ['repo', 'add', 'semantic-release-helm', registryUrl, '--force-update']
    );
}

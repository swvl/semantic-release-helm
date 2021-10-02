const AggregateError = require('aggregate-error');
const execa = require('execa');

module.exports = async (pluginConfig, context) => {
    const errors = [];

    const env = context.env;

    if (!pluginConfig.chartPath) {
        errors.push('Missing argument: chartPath');
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

async function installHelmS3Plugin() {
    await execa(
        'helm',
        ['plugin', 'install', 'https://github.com/hypnoglow/helm-s3.git']
    );
}

async function verifyS3Credentials(registryUrl) {
    await execa(
        'helm',
        ['repo', 'add', 'semantic-release-helm', registryUrl]
    );
}

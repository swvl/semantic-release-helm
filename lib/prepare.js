const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const execa = require('execa');
const minimatch = require('minimatch')

module.exports = async (pluginConfig, context) => {
    const logger = context.logger;

    let version;
    const appVersion = context.nextRelease.version;

    const lastReleaseGitTag = context.lastRelease.gitTag;
    const chartPath = pluginConfig.chartPath;
    const filePath = path.join(pluginConfig.chartPath, 'Chart.yaml');

    const chartYaml = await fsPromises.readFile(filePath);
    const oldChart = yaml.load(chartYaml);

    version = semver.inc(oldChart.version, context.nextRelease.type);

    let newChart;
    const hasChartChanges = await shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger)
    if (hasChartChanges) {
        newChart = yaml.dump({ ...oldChart, appVersion, version });
        logger.log('Updating Chart.yaml with version %s and appVersion %s.', version, appVersion);
    } else {
        newChart = yaml.dump({ ...oldChart, appVersion });
        logger.log('Updating Chart.yaml with appVersion %s.', appVersion);
    }

    await changeImageTaginValues(chartPath, appVersion)
    await fsPromises.writeFile(filePath, newChart);

};

async function changeImageTaginValues(chartPath, appVersion){
    function readWriteAsync() {
        fs.readFile(chartPath+'/values-gke.yaml', 'utf-8', function(err, data){
          if (err) throw err;
      
          var newValue = data.replace("tag:  *([A-Z])\w+(-[A-Z]*)\w+", 'tag: '+appVersion);
      
          fs.writeFile(chartPath+'/values-gke.yaml', newValue, 'utf-8', function (err) {
            if (err) throw err;
            console.log('filelistAsync complete');
          });
        });
      }
}

async function shouldUpdateChartVersion(lastReleaseGitTag, chartPath, logger) {
    try {
        const { stdout } = await execa('git', ['--no-pager', 'diff', `${lastReleaseGitTag}..HEAD`, '--name-only'])
        const files = stdout.split('\n')
        return files
            .filter(filePath => minimatch(filePath, "!**/*values*.yaml"))
            .some(file => file.includes(chartPath))
    } catch (error) {
        logger.error(error.shortMessage || error.message)
        return false
    }
}
var path = require('path'),
    vow = require('vow'),
    colors = require('../ui/colorize'),
    MakePlatform = require('../make'),
    cdir = process.cwd(),
    TargetNotFoundError = require('../errors/target-not-found-error');

/**
 * Запускает сборку.
 * Может запустить либо сборку таргетов, либо запуск тасков.
 *
 * @param {String[]} [targets]  Список целей в файловой системе, которые нужно собрать.
 * @param {Object}   [options]
 * @param {String}   [options.dir=process.cwd()]  Корень проекта.
 * @param {String}   [options.mode=development]   Режим сборки.
 * @param {Boolean}  [options.log=true]           Включено ли логгирование.
 * @param {Boolean}  [options.strict=true]        Строгий режим, при котором сборка завершается ошибкой.
 * @param {Function} [options.config]             Функция, которая инициирует конфиг сборки.
												  По умолчанию загружается из `.enb/make.js`.
 * @param {Boolean}  [options.cache=true]         Учитывать кэш при запуске таска.
 * @param {Boolean}  [options.graph=false]        Выводить граф сборки.
 * @param {Boolean}  [options.strict=true]        Строгий режим, при котором сборка завершается ошибкой,
 *                                                если запрашиваемый таргет не существует.
 * @param {Boolean}  [options.hideWarnings=false] Не выводить warning-сообщения в консоль.
 * @returns {Promise}
 */
module.exports = function (targets, options) {
    var startTime = new Date();

    targets = targets || [];
    options = options || {};

    if (arguments.length === 1 && !Array.isArray(targets)) {
        options = targets;
        targets = [];
    }

    var makePlatform = new MakePlatform();
    var root = path.resolve(options.dir || cdir);
    var cache = options.hasOwnProperty('cache') ? options.cache : true;
    var isStrict = options.hasOwnProperty('strict') ? options.strict : true;
    var needProfiler = options.profiler || options.profilerPercentiles;
    var enableLog = options.hasOwnProperty('log') ? options.log : true;
    var logger;
    var graph;

    return makePlatform.init(root, options.mode, options.config, { graph: options.graph, profiler: needProfiler })
        .then(function () {
            logger = makePlatform.getLogger();

            logger.setEnabled(enableLog);
            logger.log('build started');

            if (options.graph) {
                graph = makePlatform.getBuildGraph();
            }

            if (options.hideWarnings) {
                logger.hideWarnings();
            }

            if (cache) {
                makePlatform.loadCache();
            }

            return makePlatform.build(targets)
                .then(function () {
                    if (graph) {
                        console.log(graph.render());
                    }

                    var finishTime = new Date() - startTime,
                        message = 'build finished - ' + colors.red(finishTime + 'ms');

                    logger.log(message);

                    return vow.when(makePlatform.saveCacheAsync(), makePlatform.destruct.bind(makePlatform))
                        .then(function () {
                            if (needProfiler) {
                                var percentileRanks = options.profilerPercentiles;
                                var profiler = makePlatform.getBuildProfiler();
                                var buildTimes = profiler.calculateBuildTimes(makePlatform.getBuildGraph());
                                var techMetrics = profiler.calculateTechMetrics(buildTimes);

                                var result = {
                                    buildTimes: buildTimes,
                                    techMetrics: techMetrics,
                                };

                                if (percentileRanks && percentileRanks.length) {
                                    result.techPercentiles = profiler.calculateTechPercentiles(
                                        techMetrics, percentileRanks);
                                }

                                return result;
                            }

                            return {};
                        });
                });
        })
        .fail(function (err) {
            if (graph) {
                console.log(graph.render());
            }

            if (!isStrict && err instanceof TargetNotFoundError) {
                logger.log('build finished - ' + colors.red((new Date() - startTime) + 'ms'));
                return;
            }

            if (logger) {
                logger.log('build failed');
            }

            throw err;
        });
};

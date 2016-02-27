angular.module('kosherBaseApp', ['ui.bootstrap', 'ng-showdown', 'hljs'])


    .config(function ($showdownProvider) {
      $showdownProvider.setOption('tables', true);
    })


    .controller('ContentCtrl', function($scope, $window, $http) {
      // ok, now on start if there is no content
      if (!$('.project-description').children().length) {
        // try to guess what page should be shown

        // check for xsd file
        $http.get($window.location.pathname.replace(/\.html/, '.xsd')).then(function (response) {
          $scope.xsdData = response.data;
          $scope.xsd = $.parseXML(response.data);

          $scope.xsdElements = $($scope.xsd).find('element');
          $scope.xsdGroups = $($scope.xsd).find('group');
          $scope.xsdImports = $($scope.xsd).find('import');
          $scope.xsdComplexTypes = $($scope.xsd).find('complexType');

          $scope.contentUrl = '../template/xsd.html';
        });
      }
    })


    .controller('AppCtrl', function($scope, $http, $window) {
      $scope.commit = 'unknown';

      $http.get('/s/' + $window.location.pathname.split('/').splice(0, 4).join('/')).
          then(function(commitResponse) {
            $scope.commit = commitResponse.data.replace(/"/g, '');

            $http.get('/s/' + $scope.commit).
                then(function(buildResponse) {
                  $scope.build = buildResponse.data;
                  $scope.buildTime = moment(buildResponse.data.buildStart).fromNow();
                });
          });

      $scope.scrollToTop = function () {
        $('html, body').animate({ scrollTop: 0 }, 100);
      };

      $scope.toggleFullWindow = function () {
        $scope.fullWindow = !$scope.fullWindow;
      };

      $scope.goToEdit = function () {
        var path = window.location.pathname;
        // http://localhost:10080/root/base-listener/blame/master/LICENSE
        var root = path.split('/').slice(0,3).join('/');
        var rest = path.split('/').slice(3).join('/');
        return [ window.base_gitlab, root, "blob", rest].join('/').replace('.html', '.md');
      };

      $scope.showHistory = function () {
        var path = window.location.pathname;
        // /root/base-listener/commits/master/LICENSE
        var root = path.split('/').slice(0,3).join('/');
        var rest = path.split('/').slice(3).join('/');
        return [ window.base_gitlab, root, "commits", rest].join('/').replace('.html', '.md');
      };

      $scope.blame = function () {
        var path = window.location.pathname;
        // http://localhost:10080/root/base-listener/blame/master/LICENSE
        var root = path.split('/').slice(0,3).join('/');
        var rest = path.split('/').slice(3).join('/');
        return [ window.base_gitlab, root, "blame", rest].join('/').replace('.html', '.md');
      };
    })


    .directive('table', function($compile, $templateCache) {
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {
          if (!element.parent().hasClass('project-description') ||
              element.find('tbody tr:first-child td').length < 8 ||
              element.find('tbody tr').length < 16) {
            return;
          }

          scope.query = '';

          scope.clearQuery = function () {
            scope.query = '';
          };

          scope.$watch('query', function (n, o) {
            angular.forEach(element.find('tbody tr'), function (row) {
              var content = $(row).text();
              $(row).toggle(content.indexOf(n) >= 0);
            });
          });

          scope.switchVisibility = function (index) {
            if (scope.columns[index].visible) {
              element.find('td:nth-child(' + (index + 1) + '), th:nth-child(' + (index + 1) + ')').show();
            } else {
              element.find('td:nth-child(' + (index + 1) + '), th:nth-child(' + (index + 1) + ')').hide();
            }
          };

          scope.columns = [];

          angular.forEach(
              angular.element(element.find('tr')[0]).find('td, th'),
              function (elem) {
                scope.columns.push({
                  name: angular.element(elem).text(),
                  visible: true
                });
              });

          var btn = $compile($templateCache.get('template/table-search.html'))(scope);
          element.before(btn);
        }
      };
    })


    .directive('body', function($http) {
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {
          $http.get(window.base_mustache + 'autoreferences.json').then(function (response) {
            var words = JSON.parse(response.data);

            angular.forEach(words, function (href, word) {
              if (href.indexOf('/') > 0 && href.indexOf('://') < 0) {
                href = window.base_mustache + href;
              }

              var elementsWithWord = $("div :contains(" + word + ")")
                  .filter(function(){ return $(this).children().length === 0; });

              angular.forEach(elementsWithWord, function (elementWithWord) {
                var text = $(elementWithWord).text();
                var result = text.replace(new RegExp(word, "g"), function (replacement) {
                  return "<a href='" + href + "'>" + word + "</a>";
                });

                $(elementWithWord).html(result);
              });
            });
          });
        }
      };
    })


    .factory('gitlab', function ($http) {
      return {
        milestones: function (project) {
          return $http.get('/gl/projects/' + project + '/milestones');
        },
        milestone: function (project, id) {
          return $http.get('/gl/projects/' + project + '/milestones/' + id);
        },
        issues: function (project) {
          // add parameters to request url
          return $http.get('/gl/projects/' + project + '/issues/');
        },
        issueNotes: function (project, id) {
          return $http.get('/gl/projects/' + project + '/issues/' + issue.id + '/notes');
        },
        listFiles: function (project, ref_name, path) {
          return $http.get('/gl/projects/' + project + '/repository/tree', {
            params: {
              path: path,
              ref_name: ref_name
            }
          });
        },
        getFile: function (project, ref, file_path) {
          return $http.get('/gl/projects/' + project + '/repository/files', {
            params: {
              ref: ref,
              file_path: file_path
            }
          });
        }
      };
    })


    .directive('includeParts', function($http, $rootScope, $filter, $sce, gitlab, $compile) {
      return {
        restrict: 'E',
        scope: {
          src: '@',
          dir: '@',
          ref: '@'
        },
        link: function (scope, element, attrs) {
          scope.loadParts = function () {
            gitlab.listFiles(scope.src, scope.ref || 'master', scope.dir).then(function (response) {
              scope.parts = _.sortBy(JSON.parse(response.data), ['name']);

              scope.partBodies = {};
              angular.forEach(scope.parts, function (part) {
                gitlab.getFile(scope.src, scope.ref || 'master', scope.dir + '/' + part.name).then(function (response) {
                  scope.partBodies[part.name] = JSON.parse(response.data);
                  scope.partBodies[part.name].decoded = window.atob(scope.partBodies[part.name].content);

                  element.append('<h4>' + part.name + '</h4>');
                  if (part.name.endsWith('.xml') || part.name.endsWith('.xsd')) {
                    //scope.partBodies[part.name].decoded = _.escape(scope.partBodies[part.name].decoded);
                    element.append($compile('<div hljs hljs-source="partBodies[\'' + part.name + '\'].decoded"></div>')(scope));
                  } else if (part.name.endsWith('.md')) {
                    element.append($compile('<p markdown-to-html="partBodies[\'' + part.name + '\'].decoded"></p>')(scope));
                  } else {
                    element.append('<p>' + scope.partBodies[part.name].decoded + '</p>');
                  }
                });
              });
            });
          };

          scope.loadParts();
        }
      };
    })


    .directive('milestonesList', function($http, $rootScope, $filter, $sce, gitlab) {
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {
          if (attrs.src) {       scope.src =       attrs.src; }
          if (attrs.labels) {    scope.labels =    attrs.labels; }
          if (attrs.status) {    scope.status =    attrs.status; }
          if (attrs.milestone) { scope.milestone = attrs.milestone; }

          scope.loadMilestones();
        },
        controller: function ($scope) {
          $scope.loadMilestones = function () {
            gitlab.milestones($scope.src).then(function (response) {
              $scope.milestones = JSON.parse(response.data);
            });
          };
        }
      };
    })


    .directive('issuesList', function($http, $filter, $sce) {
      return {
        restrict: 'E',
        transclude: true,
        scope: {
          src: '@',
          labels: '@',
          milestone: '@',
          status: '@'
        },
        templateUrl: 'template/issuesList.html',
        controller: function ($scope) {
          $scope.columnDefinitions = {
            id: {
              title: '',
              format: function (issue) {
                return '<a href="' + window.base_gitlab + '/'
                    + window.gitlab_project.full_name + '/issues/' + issue.iid + '">#' + issue.iid + '</a>';
              }
            },
            title: {
              title: 'Opis'
            },
            state: {
              title: 'Status'
            },
            labels: {
              title: 'Etykiety',
              format: function (issue) {
                var result = '';
                angular.forEach(issue.labels, function (label) {
                  result += '<span class="label label-info">' + label + '</span>';
                });
                return result;
              }
            },
            'author.name': {
              title: 'Autor'
            },
            created_at: {
              title: 'Data otwarcia',
              format: function (issue) {
                return moment(issue.created_at).format('YYYY-MM-DD HH:mm:ss');
              }
            }
          };

          $scope.formatColumnData = function (columnName, issue) {
            var data = $scope.columnDefinitions[columnName] && $scope.columnDefinitions[columnName].format
                ? $scope.columnDefinitions[columnName].format(issue)
                : '' + Object.byString(issue, columnName);

            return $sce.trustAsHtml(data);
          };

          $scope.headerText = function (columnName) {
            if ($scope.columnDefinitions[columnName] && $scope.columnDefinitions[columnName].title) {
              return $scope.columnDefinitions[columnName].title;
            } else {
              return columnName;
            }
          };

          $scope.showFullIssue = function (issue) {
            if ($scope.selectedIssueData !== 'description' || $scope.selectedIssue !== issue) {
              $scope.selectedIssue = issue;
              $scope.selectedIssueData = 'description';
            } else {
              $scope.selectedIssueData = undefined;
            }
          };

          $scope.showDiscussion = function (issue) {
            if ($scope.selectedIssueData !== 'notes' || $scope.selectedIssue !== issue) {
              $scope.selectedIssue = issue;
              $scope.selectedIssueData = 'notes';

              gitlab.issueNotes(issue.project_id, issue.id).then(function (response) {
                var notes = JSON.parse(response.data);
                issue.notes = notes;
              });
            } else {
              $scope.selectedIssueData = undefined;
            }
          };

          $scope.issueRowStyle = function (issue) {
            if (issue.state === 'closed') {
              return 'text-muted';
            }

            return '';
          };

          $scope.issues = [];

          $scope.loadIssues = function () {
            angular.forEach($scope.sources, function (source) {
              function getAttrParam(attr) {
                if (source[attr] || $scope[attr]) {
                  return attr + '=' + (source[attr] ? source[attr] : $scope[attr]) + '&';
                } else {
                  return '';
                }
              }

              $http.get('/gl/projects/' + (source.src ? source.src : $scope.src) + '/issues?'
                  + getAttrParam('labels') + getAttrParam('status') + getAttrParam('milestone')
              ).then(function (response) {
                angular.forEach(JSON.parse(response.data), function (issue) {
                  $scope.issues.push(issue);
                });

                $scope.issues = $filter('orderBy')($scope.issues, 'state', true);
              });
            });
          };
        },
        link: function (scope, element, attrs) {
          scope.columns = attrs.columns ? _.map(attrs.columns.split(','), _.trim)
              : [ 'title', 'state', 'created_at', 'labels', 'author.name' ];

          scope.sources = [];
          angular.forEach(element.find('source'), function (source) {
            scope.sources.push({
              src: source.attributes.src ? source.attributes.src.value : undefined,
              labels: source.attributes.labels ? source.attributes.labels.value : undefined,
              status: source.attributes.status ? source.attributes.status.value : undefined,
              milestone: source.attributes.milestone ? source.attributes.milestone.value : undefined
            })
          });

          scope.loadIssues();
        }
      };
    })


    .run(function($window) {
      moment.locale($window.navigator.userLanguage || $window.navigator.language);
    })


    .run(function($templateCache) {
      $templateCache.put('template/table-search.html',
          '<form class="form-inline"><div class="input-group"><input type="text" class="form-control" ng-model="query">' +
          '<div class="input-group-btn"><button type="button" class="btn btn-default">' +
          '<i class="glyphicon glyphicon-remove" ng-click="clearQuery()"></i></button>' +
          '<button type="button" class="btn btn-default" popover-placement="bottom" ' +
          'popover-template="\'template/table-search-popover.html\'">' +
          '<i class="glyphicon glyphicon-cog"></i></button></div></div></form>');

      $templateCache.put('template/table-search-popover.html', '<h4 class="no-break">Found columns: {{ columns.length }}</h4>' +
          '<ol><li ng-repeat="col in columns"><b><span ng-bind="col.name"></span></b><input type="checkbox" ' +
          'class="pull-right" ng-model="col.visible" ng-click="switchVisibility($index)"></li></ol>');

      $templateCache.put('template/xxx.html', '');
    })

;


// recursive property getter function
Object.byString = function(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
};

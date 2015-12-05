angular.module('kosherBaseApp', ['ui.bootstrap'])


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

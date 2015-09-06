angular.module('kosherBaseApp', ['ui.bootstrap'])


    .controller('AppCtrl', function($scope) {
      $scope.customer = {
        name: 'Naomi',
        address: '1600 Amphitheatre'
      };
    })


    .directive('table', function($compile, $templateCache) {
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {
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


    .run(function($templateCache) {
      $templateCache.put('template/table-search.html',
          '<form class="form-inline"><div class="input-group"><input type="text" class="form-control" ng-model="query">' +
          '<div class="input-group-btn"><button type="button" class="btn btn-default">' +
          '<i class="glyphicon glyphicon-remove" ng-click="clearQuery()"></i></button>' +
          '<button type="button" class="btn btn-default" popover-placement="bottom" ' +
          'popover-template="\'template/table-search-popover.html\'">' +
          '<i class="glyphicon glyphicon-cog"></i></button></div></div></form>');

      $templateCache.put('xtemplate/table-search-popover.html', '<script type="text/ng-template" ' +
          'id="template/table-search-popover.html"><h4 class="no-break">Found columns: {{ columns.length }}</h4>' +
          '<ol><li ng-repeat="col in columns"><b><span ng-bind="col.name"></span></b><input type="checkbox" ' +
          'class="pull-right" ng-model="col.visible" ng-click="switchVisibility($index)"></li></ol></script>');

      $templateCache.put('template/xxx.html', '');
    })

;

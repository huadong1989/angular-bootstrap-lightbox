/**
 * @class     lightboxSrc
 * @classdesc This attribute directive is used in an `<img>` element in the
 *   modal template in place of `src`. It handles resizing both the `<img>`
 *   element and its relevant parent elements within the modal.
 * @memberOf  bootstrapLightbox
 */
angular.module('bootstrapLightbox').directive('lightboxSrc', ['$window',
    'ImageLoader', 'Lightbox', function ($window, ImageLoader, Lightbox) {
  // Calculate the dimensions to display the image. The max dimensions override
  // the min dimensions if they conflict.
  var calculateImageDisplayDimensions = function (dimensions, fullScreenMode) {
    var w = dimensions.width;
    var h = dimensions.height;
    var minW = dimensions.minWidth;
    var minH = dimensions.minHeight;
    var maxW = dimensions.maxWidth;
    var maxH = dimensions.maxHeight;

    var displayW = w;
    var displayH = h;

    if (!fullScreenMode) {
      // resize the image if it is too small
      if (w < minW && h < minH) {
        // the image is both too thin and short, so compare the aspect ratios to
        // determine whether to min the width or height
        if (w / h > maxW / maxH) {
          displayH = minH;
          displayW = Math.round(w * minH / h);
        } else {
          displayW = minW;
          displayH = Math.round(h * minW / w);
        }
      } else if (w < minW) {
        // the image is too thin
        displayW = minW;
        displayH = Math.round(h * minW / w);
      } else if (h < minH) {
        // the image is too short
        displayH = minH;
        displayW = Math.round(w * minH / h);
      }

      // resize the image if it is too large
      if (w > maxW && h > maxH) {
        // the image is both too tall and wide, so compare the aspect ratios
        // to determine whether to max the width or height
        if (w / h > maxW / maxH) {
          displayW = maxW;
          displayH = Math.round(h * maxW / w);
        } else {
          displayH = maxH;
          displayW = Math.round(w * maxH / h);
        }
      } else if (w > maxW) {
        // the image is too wide
        displayW = maxW;
        displayH = Math.round(h * maxW / w);
      } else if (h > maxH) {
        // the image is too tall
        displayH = maxH;
        displayW = Math.round(w * maxH / h);
      }
    } else {
      // full screen mode
      var ratio = Math.min(maxW / w, maxH / h);

      var zoomedW = Math.round(w * ratio);
      var zoomedH = Math.round(h * ratio);

      displayW = Math.max(minW, zoomedW);
      displayH = Math.max(minH, zoomedH);
    }

    return {
      'width': displayW || 0,
      'height': displayH || 0 // NaN is possible when dimensions.width is 0
    };
  };

  var getLayer = function(e) {
		if (e.layerX && e.layerY) {
			return e;
		}
		// 设置自有实现
		e.layerX = (function (ele) {
			var x = 0;
			while (ele) {
				x += ele.offsetLeft;
				ele = ele.offsetParent;
			}
			return e.pageX - x;
		}(e.target));
		e.layerY = (function (ele) {
			var y = 0;
			while (ele) {
				y += ele.offsetTop;
				ele = ele.offsetParent;
			}
			return e.pageY - y;
		}(e.target));
		return e;
	};
  
  // the dimensions of the image
  var imageWidth = 0;
  var imageHeight = 0;

  return {
    'link': function (scope, element, attrs) {
      // resize the img element and the containing modal
      var image = scope.image = {
		  el:null,
		  width:0,
		  height:0,
		  clientHeight:0,
		  clientWidth:0,
		  percent:1
	  };
	  
	  var resize = function () {
        // get the window dimensions
        var windowWidth = $window.innerWidth;
        var windowHeight = $window.innerHeight;

        // calculate the max/min dimensions for the image
        var imageDimensionLimits = Lightbox.calculateImageDimensionLimits({
          'windowWidth': windowWidth,
          'windowHeight': windowHeight,
          'imageWidth': imageWidth,
          'imageHeight': imageHeight
        });

        // calculate the dimensions to display the image
        var imageDisplayDimensions = calculateImageDisplayDimensions(
          angular.extend({
            'width': imageWidth,
            'height': imageHeight,
            'minWidth': 1,
            'minHeight': 1,
            'maxWidth': 3000,
            'maxHeight': 3000,
          }, imageDimensionLimits),
          Lightbox.fullScreenMode
        );

        // calculate the dimensions of the modal container
        var modalDimensions = Lightbox.calculateModalDimensions({
          'windowWidth': windowWidth,
          'windowHeight': windowHeight,
          'imageDisplayWidth': imageDisplayDimensions.width,
          'imageDisplayHeight': imageDisplayDimensions.height
        });

        // resize the image
        element.css({
          'width': imageDisplayDimensions.width + 'px',
          'height': imageDisplayDimensions.height + 'px'
        });

        // setting the height on .modal-dialog does not expand the div with the
        // background, which is .modal-content
        angular.element(
          document.querySelector('.lightbox-modal .modal-dialog')
        ).css({
          'width': modalDimensions.width + 'px'
        });

        // .modal-content has no width specified; if we set the width on
        // .modal-content and not on .modal-dialog, .modal-dialog retains its
        // default width of 600px and that places .modal-content off center
        angular.element(
          document.querySelector('.lightbox-modal .modal-content')
        ).css({
          'height': modalDimensions.height + 'px',
		  'overflow':'hidden'
        });
		
		Lightbox.left = 0;
		Lightbox.top = 0;
		Lightbox.deg = 0;
		
		scope.image.width = imageWidth;
		scope.image.height = imageHeight;
		scope.image.clientWidth = imageDisplayDimensions.width;
		scope.image.clientHeight = imageDisplayDimensions.height;
		scope.image.percent = 1;
      };

      // load the new image and/or resize the video whenever the attr changes
      scope.$watch(function () {
        return attrs.lightboxSrc;
      }, function (src) {
        if (!Lightbox.isVideo(Lightbox.image)) { // image
          // blank the image before resizing the element; see
          // http://stackoverflow.com/questions/5775469
          element[0].src = '//:0';

          ImageLoader.load(src).then(function (image) {
            // these variables must be set before resize(), as they are used in
            // it
            imageWidth = image.naturalWidth;
            imageHeight = image.naturalHeight;

            // resize the img element and the containing modal
            resize();

            // show the image
            element[0].src = src;
          }, function () {
            imageWidth = 0;
            imageHeight = 0;

            // resize the img element even if loading fails
            resize();
          });
        } else { // video
          // default dimensions
          imageWidth = 1280;
          imageHeight = 720;

          // resize the video element and the containing modal
          resize();

          // the src attribute applies to `<video>` and not `<embed-video>`
          element[0].src = src;
        }
      });

      // resize the image and modal whenever the window gets resized
      angular.element($window).on('resize', resize);
	  
	  
	  
	  // drag image
		var down = null;
		image.el = element[0];
		image.el.addEventListener('mousedown', function (e) {
			e.preventDefault();
			down = {
				x: e.pageX,
				y: e.pageY
			};
		});
		document.body.addEventListener('mouseup', function () {
			down = null;
		});
		element.on('mousemove', function (e) {
			e.preventDefault();
			scope.$apply(function () {
				if (!down) {
					return;
				}
				Lightbox.left += e.pageX - down.x;
				Lightbox.top += e.pageY - down.y;
				down = {
					x: e.pageX,
					y: e.pageY
				};
			});
		});
	
		// turn
		Lightbox.turn = function (deg) {
			if (!deg){
				Lightbox.deg = 0;
			}else{
				Lightbox.deg += deg;
			}
		};
		
		Lightbox.init = function(){
			resize();
		};
		
		//resize
		scope.$watch('image.percent', function () {
			scope.image.clientWidth = scope.image.width * scope.image.percent;
			scope.image.clientHeight = scope.image.height * scope.image.percent;
		});
		
		angular.element(image.el).on('mousewheel', function (e) {
			scope.$apply(function () {
				e.preventDefault();
				e = getLayer(e);
				scope.image.percent += ((e.wheelDeltaY?e.wheelDeltaY:e.originalEvent.wheelDeltaY) > 0 ? 0.05 : -0.05);
			});
		});

		angular.element(image.el).on('DOMMouseScroll', function (e) {
			scope.$apply(function () {
				e.preventDefault();
				e = getLayer(e);
				scope.image.percent += (e.detail < 0 ? 0.05 : -0.05);
			});
		});
    }
  };
}]);

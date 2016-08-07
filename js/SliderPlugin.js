/**
 * Created by richardgong on 8/7/16.
 */
(function ($) {

    /**
     * 检测是否支持css3的工具对象,如果有,那么,就用css3实现slider效果。
     * @returns {*}
     */
    var transition = (function() {
        var el = document.createElement('div')
        var transEndEventNames = {
            WebkitTransition: 'webkitTransitionEnd',
            MozTransition: 'transitionend',
            OTransition: 'oTransitionEnd otransitionend',
            transition: 'transitionend'
        }

        for (var name in transEndEventNames) {
            if (el.style[name] !== undefined) {
                return {end: transEndEventNames[name]}
            }
        }

        return false
    })();

    /**
     * 用于模拟动画结束,而自定义事件
     * @param duration
     * @returns {jQuery}
     */
    $.fn.emulateTransitionEnd = function (duration) {
        var called = false
        var $el = this
        $(this).one('mysliderTransitionEnd', function () {
            called = true
        })
        var callback = function () {
            if (!called) $($el).trigger(transition.end)
        }
        setTimeout(callback, duration)
        return this
    }


    /**
     * 把自定义事件放到jquery对象里,以方便在各个地方可以方便使用
     * @type {{bindType: (any), delegateType: (any), handle: $.event.special.mysliderTransitionEnd.handle}}
     */
    $.event.special.mysliderTransitionEnd = {
        bindType: transition.end,
        delegateType: transition.end,
        handle: function (e) {
            if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
        }
    }

    /**
     * slider插件构造函数
     * @param element
     * @param options
     * @constructor
     */
    var SliderContructor = function (element, options) {
        this.$element = $(element)
        this.$indicators = this.$element.find('.myslider-indicators')
        this.options = options
        this.paused = null
        this.sliding = null
        this.interval = null
        this.$active = null
        this.$items = null

        this.options.keyboard && this.$element.on('keydown.myslider', $.proxy(this.keydown, this))

        this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
            .on('mouseenter.myslider', $.proxy(this.pause, this))
            .on('mouseleave.myslider', $.proxy(this.cycle, this))
    }


    SliderContructor.TRANSITION_DURATION = 600

    /**
     * 默认slider参数
     * @type {{interval: number, pause: string, wrap: boolean, keyboard: boolean}}
     */
    SliderContructor.DEFAULTS = {
        interval: 5000,
        pause: 'hover',
        wrap: true,
        keyboard: true
    }

    /**
     *检测键盘事件,39表示按command键(mac机器里)。39表示按向左键
     * @param e
     */
    SliderContructor.prototype.keydown = function (e) {
        /**
         * 如果用户在input/textrea而出发的键盘事件,我们不作响应
         */
        if (/input|textarea/i.test(e.target.tagName)) return
        switch (e.which) {
            case 37:
                this.prev();
                break
            case 39:
                this.next();
                break
            default:
                return
        }

        e.preventDefault()
    }

    /**
     * slider轮询主体方法
     * @param e
     * @returns {SliderContructor}
     */
    SliderContructor.prototype.cycle = function (e) {
        e || (this.paused = false)

        /**
         * 先清除之前的setInterval以确保调用队列可靠稳定
         */
        this.interval && clearInterval(this.interval)

        this.options.interval
        && !this.paused

        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

        return this
    }

    SliderContructor.prototype.getItemIndex = function (item) {
        this.$items = item.parent().children('.item')
        return this.$items.index(item || this.$active)
    }
    /**
     * 判断当前slider的动画方向后,再获取下一个应该活动的元素
     * @param direction
     * @param active
     * @returns {*}
     */
    SliderContructor.prototype.getItemForDirection = function (direction, active) {
        var activeIndex = this.getItemIndex(active)
        var willWrap = (direction == 'prev' && activeIndex === 0)
            || (direction == 'next' && activeIndex == (this.$items.length - 1))
        if (willWrap && !this.options.wrap) return active
        var delta = direction == 'prev' ? -1 : 1
        var itemIndex = (activeIndex + delta) % this.$items.length
        return this.$items.eq(itemIndex)
    }

    SliderContructor.prototype.to = function (pos) {
        var that = this
        var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

        if (pos > (this.$items.length - 1) || pos < 0) return;


        if (this.sliding) return this.$element.one('slid.myslider', function () {
            that.to(pos);
        })

        if (activeIndex == pos) return this.pause().cycle()

        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
    }

    /**
     * 动画停止方法
     * @param e
     * @returns {SliderContructor}
     */
    SliderContructor.prototype.pause = function (e) {
        e || (this.paused = true)

        if (this.$element.find('.next, .prev').length && transition) {
            this.$element.trigger(transition.end)
            this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    /**
     * 下了个动画接口
     */
    SliderContructor.prototype.next = function () {
        if (this.sliding) return
        return this.slide('next')
    }
    /**
     * 上一个动画接口
     */
    SliderContructor.prototype.prev = function () {
        if (this.sliding) return
        return this.slide('prev')
    }
    /**
     * 动画的表现层的具体操作
     * @param type
     * @param next
     * @returns {*}
     */
    SliderContructor.prototype.slide = function (type, next) {
        var $active = this.$element.find('.item.active')
        var $next = next || this.getItemForDirection(type, $active)
        var isCycling = this.interval
        var direction = type == 'next' ? 'left' : 'right'
        var that = this

        if ($next.hasClass('active')) return (this.sliding = false)

        var relatedTarget = $next[0]
        var slideEvent = $.Event('slide.myslider', {
            relatedTarget: relatedTarget,
            direction: direction
        })
        this.$element.trigger(slideEvent)
        if (slideEvent.isDefaultPrevented()) return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active')
            var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
            $nextIndicator && $nextIndicator.addClass('active')
        }

        var slidEvent = $.Event('slid.myslider', {relatedTarget: relatedTarget, direction: direction});

        if (transition && this.$element.hasClass('slide')) {
            $next.addClass(type)
            $next[0].offsetWidth
            $active.addClass(direction)
            $next.addClass(direction)
            $active
                .one('mysliderTransitionEnd', function () {
                    $next.removeClass([type, direction].join(' ')).addClass('active')
                    $active.removeClass(['active', direction].join(' '))
                    that.sliding = false
                    setTimeout(function () {
                        that.$element.trigger(slidEvent)
                    }, 0)
                })
                .emulateTransitionEnd(SliderContructor.TRANSITION_DURATION)
        } else {
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.trigger(slidEvent)
        }

        isCycling && this.cycle()

        return this
    }


    /**
     * 插件业务入口
     * @param option
     * @returns {*}
     * @constructor
     */
    function SliderPlugin(option) {
        /**
         * this.each主要是为了实现在同一个页面上,多处调用插件
         */
        return this.each(function () {
            var $this = $(this);
            var containaier = $this;
            var data = $this.data('myslider')
            var options = $.extend({}, SliderContructor.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action = typeof option == 'string' ? option : options.slide

            if (!data) $this.data('myslider', (data = new SliderContructor(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]()
            else if (options.interval) data.pause().cycle()


            /**
             * 点击左右方向键事件的,处理业务接口
             * @param e
             */


        });
    }


    /**
     * 导出插件myslider到jquery上
     * @type {SliderPlugin}
     */

    $.fn.myslider = SliderPlugin


    function clickHandler(e) {
        var $this = $(this);
        var containaier = $($this.data('slidercontaier'));
        if (!containaier.hasClass('myslider')) return
        var options = $.extend({}, containaier.data(), $this.data());

        /**
         * 用于区分是点击控制点,还是,左右方向
         */

        var slideIndex = $(this).hasClass('slider-ctr') && $this.index();
        console.log('slideIndex:', slideIndex);
        if (slideIndex) options.interval = false

        SliderPlugin.call(containaier, options);

        if (slideIndex !== false) {
            containaier.data('myslider').to(slideIndex)
        }
        e.preventDefault();
    }

    $(document).on('click', "[data-slidercontaier]", clickHandler);

}(jQuery));


/**
 * 调用插件实例
 */
$('.myslider').myslider();



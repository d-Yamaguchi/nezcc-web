var VisModelJS;
(function (VisModelJS) {
    var ShapeSizePreFetcher = (function () {
        function ShapeSizePreFetcher() {
            var _this = this;
            this.Queue = [];
            this.TimerHandle = 0;
            this.DummyDiv = document.createElement("div");
            this.DummyDiv.style.position = "absolute";
            this.DummyDiv.style.top = "1000%";
            document.body.appendChild(this.DummyDiv);
            var LastQueueSize = 0;
            setInterval(function () {
                if (!LastQueueSize) {
                    LastQueueSize = _this.Queue.length;
                }
                if (LastQueueSize - _this.Queue.length) {
                    console.log("size prefetch: " + _this.Queue.length + " nodes left. " + (1000 / (LastQueueSize - _this.Queue.length)) + "ms/node");
                }
                LastQueueSize = _this.Queue.length;
            }, 1000);
        }
        ShapeSizePreFetcher.prototype.Start = function () {
            var _this = this;
            this.TimerHandle = setInterval(function () {
                var StartTime = VisModelJS.Utils.getTime();
                while (_this.Queue.length > 0 && VisModelJS.Utils.getTime() - StartTime < 16) {
                    var Shape = _this.Queue.shift();
                    if (Shape.NodeView && !Shape.IsSizeCached()) {
                        Shape.PrepareContent();
                        if (!Shape.Content.parentElement) {
                            _this.DummyDiv.appendChild(Shape.Content);
                        }
                        Shape.GetNodeWidth();
                        Shape.GetHeadHeight();
                        _this.DummyDiv.removeChild(Shape.Content);
                    }
                }
                if (_this.Queue.length == 0) {
                    clearInterval(_this.TimerHandle);
                    _this.TimerHandle = 0;
                }
            }, 20);
        };
        ShapeSizePreFetcher.prototype.AddShape = function (Shape) {
            this.Queue.push(Shape);
            if (!this.TimerHandle) {
                this.Start();
            }
        };
        return ShapeSizePreFetcher;
    }());
    VisModelJS.ShapeSizePreFetcher = ShapeSizePreFetcher;
    var ShapeFactory = (function () {
        function ShapeFactory() {
        }
        ShapeFactory.SetFactory = function (Factory) {
            ShapeFactory.Factory = Factory;
        };
        ShapeFactory.CreateShape = function (Node) {
            return ShapeFactory.Factory.CreateShape(Node);
        };
        ShapeFactory.prototype.CreateShape = function (Node) {
            throw Error("Not impremented");
            return null;
        };
        return ShapeFactory;
    }());
    VisModelJS.ShapeFactory = ShapeFactory;
    var Shape = (function () {
        function Shape(NodeView) {
            this.NodeView = NodeView;
            this.ColorStyles = [VisModelJS.ColorStyle.Default];
            this.willFadein = false;
            this.GXCache = null;
            this.GYCache = null;
            this.Content = null;
            this.NodeWidthCache = Shape.DefaultWidth;
            this.NodeHeightCache = 0;
            this.HeadBoundingBox = new VisModelJS.Rect(0, 0, 0, 0);
            this.TreeBoundingBox = new VisModelJS.Rect(0, 0, 0, 0);
            if (Shape.AsyncSizePrefetcher == null) {
                Shape.AsyncSizePrefetcher = new ShapeSizePreFetcher();
            }
            Shape.AsyncSizePrefetcher.AddShape(this);
        }
        Shape.prototype.IsSizeCached = function () {
            return this.NodeHeightCache != 0 && this.NodeWidthCache != 0;
        };
        Shape.CreateArrowPath = function () {
            return Shape.ArrowPathMaster.cloneNode();
        };
        Shape.prototype.SetTreeRect = function (LocalX, LocalY, Width, Height) {
            this.SetTreeUpperLeft(LocalX, LocalY);
            this.SetTreeSize(Width, Height);
        };
        Shape.prototype.SetHeadRect = function (LocalX, LocalY, Width, Height) {
            this.SetHeadUpperLeft(LocalX, LocalY);
            this.SetHeadSize(Width, Height);
        };
        Shape.prototype.SetTreeSize = function (Width, Height) {
            this.TreeBoundingBox.width = Width;
            this.TreeBoundingBox.height = Height;
        };
        Shape.prototype.SetHeadSize = function (Width, Height) {
            this.HeadBoundingBox.width = Width;
            this.HeadBoundingBox.height = Height;
        };
        Shape.prototype.GetNodeWidth = function () {
            return this.NodeWidthCache;
        };
        Shape.prototype.GetNodeHeight = function () {
            if (this.NodeHeightCache == 0) {
                var Cached = Shape.NodeHeightCache[this.Content.innerHTML];
                if (Cached) {
                    this.NodeHeightCache = Cached;
                }
                else {
                    Shape.NodeHeightCache[this.Content.innerHTML] = this.NodeHeightCache = this.Content.clientHeight;
                }
            }
            return this.NodeHeightCache;
        };
        Shape.prototype.GetTreeWidth = function () {
            if (this.TreeBoundingBox.width == 0) {
                this.TreeBoundingBox.width = 150;
            }
            return this.TreeBoundingBox.width;
        };
        Shape.prototype.GetTreeHeight = function () {
            if (this.TreeBoundingBox.height == 0) {
                this.TreeBoundingBox.height = 100;
            }
            return this.TreeBoundingBox.height;
        };
        Shape.prototype.GetHeadWidth = function () {
            if (this.HeadBoundingBox.width == 0) {
                this.HeadBoundingBox.width = 150;
            }
            return this.HeadBoundingBox.width;
        };
        Shape.prototype.GetHeadHeight = function () {
            if (this.HeadBoundingBox.height == 0) {
                this.HeadBoundingBox.height = 100;
            }
            return this.HeadBoundingBox.height;
        };
        Shape.prototype.GetTreeLeftLocalX = function () {
            return this.TreeBoundingBox.x;
        };
        Shape.prototype.GetHeadLeftLocalX = function () {
            return this.HeadBoundingBox.x;
        };
        Shape.prototype.SetTreeUpperLeft = function (LocalX, LocalY) {
            this.TreeBoundingBox.x = LocalX;
            this.TreeBoundingBox.y = LocalY;
        };
        Shape.prototype.SetHeadUpperLeft = function (LocalX, LocalY) {
            this.HeadBoundingBox.x = LocalX;
            this.HeadBoundingBox.y = LocalY;
        };
        Shape.prototype.UpdateHtmlClass = function () {
            this.Content.className = "node";
        };
        Shape.prototype.FormatNewLine = function (doc) {
            return doc.replace(/\r\n|\n|\r/g, '<br>');
        };
        Shape.prototype.PrepareHTMLContent = function () {
            if (this.Content == null) {
                var div = document.createElement("div");
                this.Content = div;
                div.id = this.NodeView.label;
                div.setAttribute("data-nodelabel", this.NodeView.label);
                if (this.NodeView.label) {
                    var h4 = document.createElement("h4");
                    h4.textContent = this.NodeView.label;
                    div.appendChild(h4);
                }
                if (this.NodeView.content) {
                    var p = document.createElement("p");
                    p.innerText = this.NodeView.content.trim();
                    div.appendChild(p);
                }
                this.UpdateHtmlClass();
            }
        };
        Shape.prototype.PrepareContent = function () {
            this.PrepareHTMLContent();
            this.PrepareSVGContent();
        };
        Shape.prototype.Render = function (HtmlContentFragment, SvgNodeFragment, SvgConnectionFragment) {
            SvgNodeFragment.appendChild(this.ShapeGroup);
            if (this.ArrowPath != null && this.NodeView.parent != null) {
                SvgConnectionFragment.appendChild(this.ArrowPath);
            }
            HtmlContentFragment.appendChild(this.Content);
        };
        Shape.prototype.FitSizeToContent = function () {
        };
        Shape.prototype.RemoveAnimateElement = function (Animate) {
            if (Animate) {
                var Parent = Animate.parentNode;
                if (Parent) {
                    Parent.removeChild(Animate);
                }
            }
        };
        Shape.prototype.SetPosition = function (x, y) {
            if (this.NodeView.visible) {
                var div = this.Content;
                if (div != null) {
                    div.style.left = x + "px";
                    div.style.top = y + "px";
                }
                var mat = this.ShapeGroup.transform.baseVal.getItem(0).matrix;
                mat.e = x;
                mat.f = y;
            }
            this.GXCache = x;
            this.GYCache = y;
        };
        Shape.prototype.SetOpacity = function (Opacity) {
            this.Content.style.opacity = Opacity.toString();
            this.ShapeGroup.style.opacity = Opacity.toString();
        };
        Shape.prototype.Fadein = function (AnimationCallbacks, Duration) {
            var _this = this;
            var V = 1 / Duration;
            var Opacity = 0;
            AnimationCallbacks.push(function (deltaT) {
                Opacity += V * deltaT;
                _this.SetOpacity(Opacity);
                _this.SetArrowOpacity(Opacity);
            });
        };
        Shape.prototype.MoveTo = function (AnimationCallbacks, x, y, Duration, ScreenRect) {
            var _this = this;
            if (Duration <= 0) {
                this.SetPosition(x, y);
                return;
            }
            if (this.WillFadein()) {
                if (ScreenRect && (y + this.GetNodeHeight() < ScreenRect.y || y > ScreenRect.y + ScreenRect.height)) {
                    this.SetPosition(x, y);
                    this.willFadein = false;
                    return;
                }
                this.Fadein(AnimationCallbacks, Duration);
                this.willFadein = false;
                if (this.GXCache == null || this.GYCache == null) {
                    this.SetPosition(x, y);
                    return;
                }
            }
            if (ScreenRect) {
                Shape.__Debug_Animation_TotalNodeCount++;
                if (this.GXCache + this.GetNodeWidth() < ScreenRect.x || this.GXCache > ScreenRect.x + ScreenRect.width) {
                    if (x + this.GetNodeWidth() < ScreenRect.x || x > ScreenRect.x + ScreenRect.width) {
                        this.SetPosition(x, y);
                        return;
                    }
                }
                if (this.GYCache + this.GetNodeHeight() < ScreenRect.y || this.GYCache > ScreenRect.y + ScreenRect.height) {
                    this.SetPosition(x, y);
                    return;
                }
            }
            var VX = (x - this.GXCache) / Duration;
            var VY = (y - this.GYCache) / Duration;
            AnimationCallbacks.push(function (deltaT) { return _this.SetPosition(_this.GXCache + VX * deltaT, _this.GYCache + VY * deltaT); });
        };
        Shape.prototype.SetFadeinBasePosition = function (StartGX, StartGY) {
            this.willFadein = true;
            this.GXCache = StartGX;
            this.GYCache = StartGY;
            this.ArrowP1Cache = this.ArrowP2Cache = new VisModelJS.Point(StartGX + this.GetNodeWidth() * 0.5, StartGY + this.GetNodeHeight() * 0.5);
        };
        Shape.prototype.GetGXCache = function () {
            return this.GXCache;
        };
        Shape.prototype.GetGYCache = function () {
            return this.GYCache;
        };
        Shape.prototype.WillFadein = function () {
            return this.willFadein || this.GXCache == null || this.GYCache == null;
        };
        Shape.prototype.ClearAnimationCache = function () {
            this.GXCache = null;
            this.GYCache = null;
        };
        Shape.prototype.PrepareSVGContent = function () {
            this.ShapeGroup = VisModelJS.Utils.createSVGElement("g");
            this.ShapeGroup.setAttribute("transform", "translate(0,0)");
            this.ShapeGroup.setAttribute("class", this.ColorStyles.join(" "));
            this.ArrowPath = Shape.CreateArrowPath();
            this.ArrowStart = this.ArrowPath.getPathData()[0];
            this.ArrowCurve = this.ArrowPath.getPathData()[1];
        };
        Shape.prototype.GetArrowP1Cache = function () {
            return this.ArrowP1Cache;
        };
        Shape.prototype.GetArrowP2Cache = function () {
            return this.ArrowP2Cache;
        };
        Shape.prototype.SetArrowPosition = function (P1, P2, Dir) {
            var start = this.ArrowStart;
            var curve = this.ArrowCurve;
            start.values[0] = P1.x;
            start.values[1] = P1.y;
            curve.values[4] = P2.x;
            curve.values[5] = P2.y;
            if (Dir == VisModelJS.Direction.Bottom || Dir == VisModelJS.Direction.Top) {
                var DiffX = Math.abs(P1.x - P2.x);
                curve.values[0] = (9 * P1.x + P2.x) / 10;
                curve.values[1] = P2.y;
                curve.values[2] = (9 * P2.x + P1.x) / 10;
                curve.values[3] = P1.y;
                if (DiffX > 300) {
                    curve.values[0] = P1.x - 10 * (P1.x - P2.x < 0 ? -1 : 1);
                    curve.values[2] = P2.x + 10 * (P1.x - P2.x < 0 ? -1 : 1);
                }
                if (DiffX < 50) {
                    curve.values[1] = curve.values[3] = (P1.y + P2.y) * 0.5;
                }
            }
            else {
                curve.values[0] = (P1.x + P2.x) / 2;
                curve.values[1] = (9 * P1.y + P2.y) / 10;
                curve.values[2] = (P1.x + P2.x) / 2;
                curve.values[3] = (9 * P2.y + P1.y) / 10;
            }
            this.ArrowP1Cache = P1;
            this.ArrowP2Cache = P2;
            var a = this.ArrowPath.getPathData();
            a[0] = start;
            a[1] = curve;
            this.ArrowPath.setPathData(a);
        };
        Shape.prototype.SetArrowOpacity = function (Opacity) {
            this.ArrowPath.style.opacity = Opacity.toString();
        };
        Shape.prototype.MoveArrowTo = function (AnimationCallbacks, P1, P2, Dir, Duration, ScreenRect) {
            var _this = this;
            if (Duration <= 0) {
                this.SetArrowPosition(P1, P2, Dir);
                return;
            }
            if (ScreenRect) {
                var R0 = this.ArrowP1Cache.x < this.ArrowP2Cache.x ? this.ArrowP2Cache.x : this.ArrowP1Cache.x;
                var L0 = this.ArrowP1Cache.x < this.ArrowP2Cache.x ? this.ArrowP1Cache.x : this.ArrowP2Cache.x;
                if (R0 < ScreenRect.x || L0 > ScreenRect.x + ScreenRect.width) {
                    var R1 = P1.x < P2.x ? P2.x : P1.x;
                    var L1 = P1.x < P2.x ? P1.x : P2.x;
                    if (R1 < ScreenRect.x || L1 > ScreenRect.x + ScreenRect.width) {
                        this.SetArrowPosition(P1, P2, Dir);
                        return;
                    }
                }
                if (this.ArrowP2Cache.y < ScreenRect.y || this.ArrowP1Cache.y > ScreenRect.y + ScreenRect.height) {
                    this.SetArrowPosition(P1, P2, Dir);
                    return;
                }
            }
            if (this.ArrowP1Cache == this.ArrowP2Cache && ScreenRect && (P2.y + this.GetNodeHeight() < ScreenRect.y || P1.y > ScreenRect.y + ScreenRect.height)) {
                this.SetArrowPosition(P1, P2, Dir);
                return;
            }
            var P1VX = (P1.x - this.ArrowP1Cache.x) / Duration;
            var P1VY = (P1.y - this.ArrowP1Cache.y) / Duration;
            var P2VX = (P2.x - this.ArrowP2Cache.x) / Duration;
            var P2VY = (P2.y - this.ArrowP2Cache.y) / Duration;
            var CurrentP1 = this.ArrowP1Cache.clone();
            var CurrentP2 = this.ArrowP2Cache.clone();
            AnimationCallbacks.push(function (deltaT) {
                CurrentP1.x += P1VX * deltaT;
                CurrentP1.y += P1VY * deltaT;
                CurrentP2.x += P2VX * deltaT;
                CurrentP2.y += P2VY * deltaT;
                _this.SetArrowPosition(CurrentP1, CurrentP2, Dir);
            });
        };
        Shape.prototype.SetArrowColorWhite = function (IsWhite) {
            if (IsWhite) {
                this.ArrowPath.setAttribute("marker-end", "url(#Triangle-white)");
            }
            else {
                this.ArrowPath.setAttribute("marker-end", "url(#Triangle-black)");
            }
        };
        Shape.prototype.GetConnectorPosition = function (Dir) {
            switch (Dir) {
                case VisModelJS.Direction.Right:
                    return new VisModelJS.Point(this.GetNodeWidth(), this.GetNodeHeight() / 2);
                case VisModelJS.Direction.Left:
                    return new VisModelJS.Point(0, this.GetNodeHeight() / 2);
                case VisModelJS.Direction.Top:
                    return new VisModelJS.Point(this.GetNodeWidth() / 2, 0);
                case VisModelJS.Direction.Bottom:
                    return new VisModelJS.Point(this.GetNodeWidth() / 2, this.GetNodeHeight());
                default:
                    return new VisModelJS.Point(0, 0);
            }
        };
        Shape.prototype.addColorStyle = function (ColorStyleCode) {
            if (ColorStyleCode) {
                if (this.ColorStyles.indexOf(ColorStyleCode) < 0) {
                    this.ColorStyles.push(ColorStyleCode);
                }
                if (this.ShapeGroup) {
                    this.ShapeGroup.setAttribute("class", this.ColorStyles.join(" "));
                }
            }
        };
        Shape.prototype.removeColorStyle = function (ColorStyleCode) {
            if (ColorStyleCode && ColorStyleCode != VisModelJS.ColorStyle.Default) {
                var Index = this.ColorStyles.indexOf(ColorStyleCode);
                if (Index > 0) {
                    this.ColorStyles.splice(Index, 1);
                }
                if (this.ShapeGroup) {
                    this.ShapeGroup.setAttribute("class", this.ColorStyles.join(" "));
                }
            }
        };
        Shape.prototype.getColorStyle = function () {
            return this.ColorStyles;
        };
        Shape.prototype.setColorStyle = function (Styles) {
            this.ColorStyles = Styles;
            if (this.ColorStyles.indexOf(VisModelJS.ColorStyle.Default) < 0) {
                this.ColorStyles.push(VisModelJS.ColorStyle.Default);
            }
        };
        Shape.prototype.ClearColorStyle = function () {
            this.ColorStyles = [VisModelJS.ColorStyle.Default];
            if (this.ShapeGroup) {
                this.ShapeGroup.setAttribute("class", this.ColorStyles.join(" "));
            }
        };
        Shape.NodeHeightCache = {};
        Shape.DefaultWidth = 150;
        Shape.ArrowPathMaster = (function () {
            var Master = VisModelJS.Utils.createSVGElement("path");
            Master.setAttribute("marker-end", "url(#Triangle-black)");
            Master.setAttribute("fill", "none");
            Master.setAttribute("stroke", "gray");
            Master.setAttribute("d", "M0,0 C0,0 0,0 0,0");
            return Master;
        })();
        return Shape;
    }());
    VisModelJS.Shape = Shape;
})(VisModelJS || (VisModelJS = {}));

// (function z (info) {if (info.getFront() == NEIGHBOR.OTHER) { return MOVE.INFECT; } else if (info.getFront() == NEIGHBOR.WALL) { return MOVE.RIGHT; } else if (info.getFront() == NEIGHBOR.SAME) { return MOVE.RIGHT; } return MOVE.HOP;})(info);

(function (w, d, $, m) {
	// ***** START "POLYFILLS" *****
	// FROM https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim#Polyfill
	if (!String.prototype.trim) {
		String.prototype.trim = function () {
			return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
		};
	}

	// FROM https://github.com/tc39/proposal-object-values-entries/blob/master/polyfill.js
	const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
	const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
	const concat = Function.bind.call(Function.call, Array.prototype.concat);
	const keys = Reflect.ownKeys;

	if (!Object.values) {
		Object.values = function values(O) {
			return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
		};
	}
	// ***** END "POLYFILLS" *****

	// ***** START "CACHED ELEMENTS" *****
	var cache = {
		"board": $("main"),
		"panel": $(".panel"),
		"counts": $(".counts"),
		"move": $("#move")
	};
	// ***** END "CACHED ELEMENTS" *****

	// ***** START "SHARED FUNCTIONS" *****
	function nextInt (max) {
		return m.floor(m.random() * max);
	};
	function shuffle (array) {
		var currentIndex = array.length, temporaryValue, randomIndex;
		while (0 !== currentIndex) {
			randomIndex = m.floor(m.random() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}
		return array;
	};
	var GUIDGenerator = {
		"guid": 0,
		"next": function () {
			this.guid++;
			return this.guid - 1;
		}
	};
	// ***** END "SHARED FUNCTIONS" *****

	// ***** START "SHARED VALUES" *****
	var GENERATED_MOVE = "";
	var DIRECTION = {
		"NORTH": 0,
		"EAST": 1,
		"SOUTH": 2,
		"WEST": 3
	};
	var MOVE = {
		"STAY": 0,
		"HOP": 1,
		"LEFT": 2,
		"RIGHT": 3,
		"INFECT": 4
	};
	var NEIGHBOR = {
		"WALL": 0,
		"EMPTY": 1,
		"SAME": 2,
		"OTHER": 3
	};
	// ***** END "SHARED VALUES" *****

	// ***** START "CRITTERS" *****
	var Critter = function (_type) {
		this._type = _type;
		this._guid = GUIDGenerator.next();
	};
	Critter.prototype.getGUID = function () {
		return this._guid;
	};
	Critter.prototype.getMove = function (info) {
		return MOVE.STAY;
	};
	Critter.prototype.getType = function () {
		return this._type;
	};
	Critter.prototype.isType = function (type) {
		return this.getType() == type;
	};

	function Food () {
		Critter.call(this, "FOOD");
	};
	Food.prototype = Object.create(Critter.prototype);
	Food.prototype.constructor = Food;

	function FlyTrap () {
		Critter.call(this, "FLYTRAP");
	};
	FlyTrap.prototype = Object.create(Critter.prototype);
	FlyTrap.prototype.constructor = FlyTrap;
	FlyTrap.prototype.getMove = function (info) {
		return MOVE.INFECT;
	};

	function Zombie () {
		Critter.call(this, "ZOMBIE");
	};
	Zombie.prototype = Object.create(Critter.prototype);
	Zombie.prototype.constructor = Zombie;
	Zombie.prototype.getMove = function (info) {
		return eval(GENERATED_MOVE);
	};
	// ***** END "CRITTERS" *****

	// ***** START "ESSENTIALS" *****
	var Point = function (_x, _y) {
		this._x = _x;
		this._y = _y;
	};
	Point.prototype.getX = function () {
		return this._x;
	};
	Point.prototype.getY = function () {
		return this._y;
	};
	Point.prototype.move = function (x, y) {
		this._x = x;
		this._y = y;
	};
	Point.prototype.translate = function (dx, dy) {
		this._x += dx;
		this._y += dy;
	};

	var Info = function (_neighbors, _direction, _infections) {
		this._neighbors = _neighbors;
		this._direction = _direction;
		this._infections = _infections;
	};
	Info.prototype.getFront = function () {
		return this._neighbors[0];
	}
	Info.prototype.getBack = function () {
		return this._neighbors[2];
	}
	Info.prototype.getLeft = function () {
		return this._neighbors[3];
	}
	Info.prototype.getRight = function () {
		return this._neighbors[1];
	}
	Info.prototype.getDirection = function () {
		return this._direction;
	}
	Info.prototype.getInfections = function () {
		return this._infections;
	}
	Info.prototype.addInfection = function () {
		this._infections += 1;
	}

	var Board = function (_height, _width) {
		this._height = _height;
		this._width = _width;
		this._grid = [];
		this._info = {};
		this._counts = {};

		cache.board.find(".critter").remove();
	};
	// START HELPERS
	Board.prototype.addCritter = function (critter, point, direction) {
		this._grid[this.getIndex(point.getX(), point.getY())] = critter;
		cache.board.append("<div id='" + critter.getGUID() + "' class='critter " + critter.getType() + "'></div>");

		this._info[critter.getGUID()] = {
			"_point": point,
			"_direction": direction,
			"_infections": 0
		};
	};
	Board.prototype.getData = function (critter) {
		return this._info[critter.getGUID()];
	};
	Board.prototype.getIndex = function (x, y) {
		return x * this._width + y;
	};
	Board.prototype.getStatus = function (point, type) {
		if (!this.inBounds(point)) {
			return NEIGHBOR.WALL;
		}
		var other = this._grid[this.getIndex(point._x, point._y)];
		if (!other) {
			return NEIGHBOR.EMPTY;
		} else if (other.isType(type)) {
			return NEIGHBOR.SAME;
		} else {
			return NEIGHBOR.OTHER;
		}
	};
	Board.prototype.makeCritter = function (type) {
		switch (type.toUpperCase()) {
			case "FOOD":
				return new Food();
			case "FLYTRAP":
				return new FlyTrap();
			case "ZOMBIE":
				return new Zombie();
		}
		return new Critter();
	};
	Board.prototype.pointAt = function (point, direction) {
		switch (direction) {
			case DIRECTION.NORTH:
				return new Point(point._x, point._y - 1);
			case DIRECTION.SOUTH:
				return new Point(point._x, point._y + 1);
			case DIRECTION.EAST:
				return new Point(point._x + 1, point._y);
		}
		return new Point(point._x - 1, point._y);
	};
	Board.prototype.rotate = function (direction) {
		switch (direction) {
			case DIRECTION.NORTH:
				return DIRECTION.EAST;
			case DIRECTION.SOUTH:
				return DIRECTION.WEST;
			case DIRECTION.EAST:
				return DIRECTION.SOUTH;
		}
		return DIRECTION.NORTH;
	};
	Board.prototype.setData = function (critter, key, value) {
		this._info[critter.getGUID()][key] = value;
	};
	Board.prototype.paint = function () {
		var dx = cache.board.width() / this._width;
		var dy = cache.board.height() / this._height;

		var keys = Object.keys(this._info);
		var key, info;
		for (var i = 0; i < keys.length; i++) {
			key = keys[i];
			info = this._info[key];
			var styles = {
				"top": info._point.getY() * dy,
				"left": info._point.getX() * dx
			};

			cache.board.find("#" + key).css(styles);
		}
	};
	// END HELPERS
	Board.prototype.getPoint = function (critter) {
		return this.getData(critter)._point;
	};
	Board.prototype.getCounts = function () {
		return this._counts;
	};
	Board.prototype.getInfo = function (data, type) {
		var neighbors = [];
		var d = data._direction;
		for (var i = 0; i < 4; i++) {
			neighbors.push(this.getStatus(this.pointAt(data._point, d), type));
			d = this.rotate(d);
		}
		return new Info(neighbors, data._direction, data._infections);
	};
	Board.prototype.add = function (n, type) {
		if (n < 0 || Object.keys(this._info).length + n > this._height * this._width) {
			return;
		}
		var critter, x, y, index;
		var directions = Object.keys(DIRECTION);
		for (var i = 0; i < n; i++) {
			critter = this.makeCritter(type);

			do {
				x = nextInt(this._width);
				y = nextInt(this._height);
				index = this.getIndex(x, y);
			} while (this._grid[index]);
			this.addCritter(critter, new Point(x, y), DIRECTION[directions[nextInt(directions.length)]]);

			if (!this._counts[type]) {
				this._counts[type] = 0;
			}
			this._counts[type] += 1;
		}
		this.paint();
	};
	Board.prototype.remove = function (critter) {
		cache.board.find("#" + critter.getGUID()).remove();
		delete this._info[critter.getGUID()];
	};
	Board.prototype.inBounds = function (point) {
		var x = point.getX(), y = point.getY();
		return (x >= 0 && x < this._width && y >= 0 && y < this._height);
	};
	Board.prototype.update = function () {
		var list = shuffle(Object.values(this._grid));

		var critter, data;
		for (var i = 0; i < list.length; i++) {
			critter = list[i];
			data = this.getData(critter);
			if (data) {

				var p1 = data._point;
				var p2 = this.pointAt(p1, data._direction);
				var i1 = this.getIndex(p1.getX(), p1.getY());
				var i2 = this.getIndex(p2.getX(), p2.getY());

				var move = critter.getMove(this.getInfo(data, critter.getType()));

				switch (move) {
					case MOVE.LEFT:
						this.setData(critter, "_direction", this.rotate(this.rotate(this.rotate(data._direction))));
						break;
					case MOVE.RIGHT:
						this.setData(critter, "_direction", this.rotate(data._direction));
						break;
					case MOVE.HOP:
						if (this.inBounds(p2) && !this._grid[i2]) {

							this._grid[i2] = this._grid[i1];
							delete this._grid[i1];

							this.setData(critter, "_point", p2);
						}
						break;
					case MOVE.INFECT:
						if (this.inBounds(p2) && this._grid[i2] && this._grid[i2].getType() != critter.getType()) {
							var other = this._grid[i2];
							var old = this.getData(other);
							var created;

							this._counts[critter.getType()] += 1;
							this._counts[other.getType()] -= 1;

							this.remove(other);

							created = this.makeCritter(critter.getType());
							this.addCritter(created, old._point, old._direction);

							this.setData(critter, "_infections", data._infections + 1);
						}
						break;
					default:
						break;
				}

			}
		}
		this.paint();
	};

	var Panel = function () {
		this._moves = Object.keys(MOVE);
		this._neighbors = Object.keys(NEIGHBOR);
		this._edit = '<div class="add">+</div>';
		this._condition = '<div class="condition"><select class="neighbor"><option value="WALL">a wall</option><option value="EMPTY">nothing</option><option value="SAME">a teammate</option><option value="OTHER">an opponent</option></select><select class="operator"><option value="==">is</option><option value="!=">is not</option></select><select class="look"><option value="Front">in front</option><option value="Left">to the left</option><option value="Back">behind</option><option value="Right">to the right</option></select></div>';
		this._return = '<select class="return"><option value="STAY">Stay</option><option value="HOP">Hop</option><option value="LEFT">Turn left</option><option value="RIGHT">Turn right</option><option value="INFECT">Tag!</option></select>';
		cache.counts.children().remove();
	};
	// START HELPERS
	Panel.prototype.getClass = function ($element) {
		var htmlClass = $element.attr("class");
		if (htmlClass !== undefined) {
			return htmlClass.trim().toLowerCase();
		}
		return null;
	};
	// END HELPERS
	Panel.prototype.add = function (type) {
		var $element = cache.move.find(".if");
		switch (type) {
			case "if":
				$element.append('<div class="if"><div class="logic">' + this._condition + this._return + this._edit + '<div class="else"><div class="logic">'+ this._return + '</div></div></div></div>');
				break;
			case "elseif":
				$element.find(".else").before('<div class="elseif"><div class="logic">' + this._condition + this._return + '</div></div>' + this._edit);
				break;
			default:
				break;
		}
	};
	Panel.prototype.parse = function () {
		GENERATED_MOVE = this.parseElement(cache.move);
	};
	Panel.prototype.parseChildren = function ($element) {
		var panel = this;
		var code = "";
		if ($element.children(".logic").length) {
			$element = $element.find("> .logic");
		}
		$element.children(".if, .elseif, .else, .return").each(function () {
			code += panel.parseElement($(this));
		});
		return code;
	};
	Panel.prototype.parseConditional = function ($element) {
		var code = "";
		$element.find("> .logic > .condition:first-of-type select").each(function () {
			var $this = $(this);
			var value = $this.val();
			if ($this.hasClass("look")) {
				code += " info.get" + value + "() ";
			} else if ($this.hasClass("operator")) {
				code += " " + value + " ";
			} else if ($this.hasClass("neighbor")) {
				code += " NEIGHBOR." + value + " ";
			}
		});
		return code;
	};
	Panel.prototype.parseElement = function ($element) {
		var code = "";
		switch (this.getClass($element)) {
			case "return":
				code = " return MOVE." + $element.val() + "; ";
				break;
			case "if":
				code = " if (" + this.parseConditional($element) + ") { " + this.parseChildren($element) + " } ";
				break;
			case "elseif":
				code = " } else if (" + this.parseConditional($element) + ") { " + this.parseChildren($element);
				break;
			case "else":
				code = " } else { " + this.parseChildren($element);
				break;
			default:
				code = "(function z (info) {" + this.parseChildren($element) + "})(info);";
				break;
		}
		return code;
	};
	Panel.prototype.update = function (counts) {
		var names = {
			"FOOD": "Pizza",
			"FLYTRAP": "Frog",
			"ZOMBIE": "Eagle"
		};
		var types = Object.keys(counts);
		var total = 0, percentage, type;
		for (var i = 0; i < types.length; i++) {
			total += parseInt(counts[types[i]]);
		}

		for (var i = 0; i < types.length; i++) {
			type = types[i];
			if (!cache.counts.find("#" + type).length) {
				cache.counts.append("<li id='" + type + "'></li>");
			}
			percentage = m.round(counts[type] / total * 100);
			var style = "width: " + percentage + "%;background-color:";
			if (percentage >= 75) {
				style += "#4CAF50;"
			} else if (percentage >= 50) {
				style += "#2196F3;";
			} else if (percentage >= 25) {
				style += "#FFEB3B;"
			} else {
				style += "#F44336;"
			}

			cache.counts.find("#" + type).html('<p><img src="static/images/' + names[type].toLowerCase() + '.png" />' + names[type] + ':</p><span style="' + style + '"></span>');

			if (percentage === 100 && total === 90 && w.manager.isStarted()) {
				w.console.log(total);
				w.manager.stop();
				alert("Congrats! You won!");
			}
		}
	};
	Panel.prototype.validate = function () {
		return this.validateElement(cache.move);
	};
	Panel.prototype.validateChildren = function ($element) {
		var panel = this;
		if ($element.children(".logic").length) {
			$element = $element.find("> .logic");
		}
		$element.children(".if, .elseif, .else, .return").each(function () {
			if (!panel.validateElement($(this))) {
				return false;
			}
		});
		return true;
	};
	Panel.prototype.validateConditional = function ($element) {
		var panel = this;
		$element.find("> .logic > .condition:first-of-type select").each(function () {
			var $this = $(this);
			var value = $this.val();
			if ($this.hasClass("look") && (["Front","Left","Back","Right"]).indexOf(value) === -1) {
				return false;
			} else if ($this.hasClass("operator") && (["==","!="]).indexOf(value) === -1) {
				return false;
			} else if ($this.hasClass("neighbor") && panel._neighbors.indexOf(value) === -1) {
				return false;
			}
		});
		return true;
	};
	Panel.prototype.validateElement = function ($element) {
		switch (this.getClass($element)) {
			case "return":
				return this._moves.indexOf($element.val().trim().toUpperCase()) !== -1;
			case "if":
			case "elseif":
				return this.validateConditional($element) && this.validateChildren($element);
			default:
				return this.validateChildren($element);
		}
	};

	var Manager = function (_height, _width) {
		this._board = new Board(_height, _width);
		this._panel = new Panel();
		this._started = false;
		this._interval = null;
	};
	Manager.prototype.add = function (n, type) {
		if (!this._started) {
			this._started = true;
			this._board.add(n, type);
			this._panel.update(this._board.getCounts());
			this._started = false;
		}
	};
	Manager.prototype.isStarted = function () {
		return this._started;
	};
	Manager.prototype.step = function () {
		this._board.update();
		this._panel.update(this._board.getCounts());
	};
	Manager.prototype.start = function () {
		if (!this._started) {
			if (this._panel.validate()) {
				this._panel.parse();

				this._interval = w.setInterval(function () {
					w.manager.step();
				}, 150);
				this._started = true;
			} else {
				// TODO: Show error
			}
		}
	};
	Manager.prototype.stop = function () {
		if (this._started) {
			w.clearInterval(this._interval);
			this._interval = null;
			this._started = false;
		}
	};
	Manager.prototype.addConditional = function (type) {
		this._panel.add(type);
	};
	// ***** END "ESSENTIALS" *****

	// ***** START "MAIN" *****
	var interval = null;
	w.manager = null;

	function create () {
		w.manager = new Manager(60, 40);
		w.manager.add(30, "FOOD");
		w.manager.add(30, "FLYTRAP");
		w.manager.add(30, "ZOMBIE");
	};

	$("#start").on("click", function () {
		w.manager.start();
	});
	$("#stop").on("click", function () {
		w.manager.stop();
	});
	$("#reset").on("click", function () {
		w.manager.stop();
		create();
	});
	$(d).on("click", ".add", function () {
		w.manager.addConditional("elseif");
	});
	$(".loader").remove();

	create();

	// ***** START "MAIN" *****

})(window, document, window.jQuery, window.Math);
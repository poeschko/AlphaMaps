(function() { // module closure
/*
 * SETUP:
 * Point QUERY_URL to your server.
 */
var QUERY_URL = 'http://poeschko.com/alphamaps/query.php';
	
function strip(str) {
	function isSpace(c) {
		return c == ' ' || c == '\n' || c == '\r' || c == '\t';
	}
	
	while (str && isSpace(str[0]))
		str = str.substr(1);
	while (str && isSpace(str[str.length - 1]))
		str = str.substr(0, str.length-1);
	return str;
}

function E(tag, className, children, attr) {
  var elmt = document.createElement(tag);
  if (String(className) === className)
    $(elmt).addClass(className);
  else {
  	attr = children;
  	children = className;
  }
  if (children)
	  for (var i = 0; i < children.length; ++i) {
	  	elmt.appendChild(children[i]);
	  }
  if (attr)
  	$(elmt).attr(attr);
  return elmt;
}

function T(text) {
  return document.createTextNode(text);
}

$(document).ready(function() {
	var map;
	var openWindow = null;
	var markers = [];

	function initializeMap() {
		var myOptions = {
	    center: new google.maps.LatLng(0, 0),
	    zoom: 2,
	    mapTypeId: google.maps.MapTypeId.TERRAIN
		};
		map = new google.maps.Map(document.getElementById("map_canvas"),
		   myOptions);
	}
	
  initializeMap();
  
  google.maps.event.addListener(map, 'click', function() {
  	if (openWindow)
  		openWindow.close();
  })
  
  function plainTable(plaintext) {
    var result = [];
    lines = plaintext.split('\n');
    for (var index = 0; index < lines.length; ++index) {
      var line = lines[index];
      var cells = line.split('|');
      var newCells = [];
      $(cells).each(function(index, cell) {
      	cell = strip(cell);
      	if (cell)
      		newCells.push(cell);
      })
      cells = newCells;
      if (result.length > 0 || (cells.length > 0 && cells[0]))
      	result.push(cells);
    }
    return result;
  }
  
  function parseLocation(coords) {
  	coords = String(coords);
    var match = coords.match(/^\s*(\d*\.?\d+)\s*.\s*([NS])\s*,\s*(\d*\.?\d+)\s*.\s*([WE])\s*$/);
    // 47.08°N, 15.42°E
    if (match)
      return [parseFloat(match[1]) * (match[2] == 'N' ? 1 : -1),
        parseFloat(match[3]) * (match[4] == 'E' ? 1 : -1)];
    return false;
  }
  
  function createInfo(data) {
    var container = E('div', 'info');
    var pods = E('div', 'pods');
    var info = {};
    var nearby = [];
    $(data).find('pod').each(function(index, pod) {
      var podDiv = E('div', 'pod');
      var podTitle = $(pod).attr('title');
      podDiv.appendChild(E('h2', [T(podTitle)]));
      var hasSubpods = false;
      $(pod).find('subpod').each(function(index, subpod) {
        var textNode = $(subpod).find('plaintext').contents()[0];
        if (!textNode)
          return;
        var table = plainTable(textNode.data);
        if (table.length > 0 && table[0].length > 0 && table[0][0]) {
	        var subpodDiv = E('div', 'subpod');
	        hasSubpods = true;
	        if (podTitle == "Input interpretation") {
	        	info.title = table[0][0];
	        	info.shortTitle = info.title.split(',')[0].split('(')[0];
	        }
	        else if (podTitle == "Location") {
	          var coords = parseLocation(table[0][0]);
	          if (coords)
	            info.location = coords;
	        }
	        else if (podTitle == "Nearby cities" || podTitle == "Nearby city") {
	        	$(table).each(function(index, row) {
		        	nearby.push({
		        		type: 'city',
		        		name: row[0]
		        	})	        		
	        	});
	        }
	        else if (podTitle == "Nearby features" || podTitle == "Nearby feature") {
	        	$(table).each(function(index, row) {
		        	nearby.push({
		        		type: row[0],	// mountain, waterfall, nuclear power site, dam
		        		name: row[1]
		        	})	        		
	        	});
	        }
	        else if (podTitle == "Nearby airports" || podTitle == "Nearby airport") {
	        	$(table).each(function(index, row) {
		        	nearby.push({
		        		type: 'airport',
		        		name: row[0]
		        	})	        		
	        	});
	        }
	        else if (podTitle == "Nearby hospitals" || podTitle == "Nearby hospital") {
	        	$(table).each(function(index, row) {
		        	nearby.push({
		        		type: 'hospital',
		        		name: row[0]
		        	})	        		
	        	});
	        }
	        var tableElmt = E('table');
	        for (var rowIdx = 0; rowIdx < table.length; ++rowIdx) {
	        	row = table[rowIdx];
	        	var tr = E('tr');
	        	for (var cell = 0; cell < row.length; ++cell)
	        		tr.appendChild(E('td', [T(row[cell])]));
	        	tableElmt.appendChild(tr);
	        }
	        subpodDiv.appendChild(tableElmt);
	        podDiv.appendChild(subpodDiv);
        }
      })
      if (hasSubpods)
      	pods.appendChild(podDiv);
    })
    container.appendChild(pods);
    container.appendChild(E('div', 'note', [T("Data provided by "), E('a', [T("Wolfram|Alpha")], {'href': "http://www.wolframalpha.com"})]));
    var newNearby = [];
    $(nearby).each(function(index, item) {
    	if (item.name) {
	    	var name = item.name.split('(')[0];
	    	item.name = strip(name);
	    	if (name)
	    		newNearby.push(item);
    	}
    })
    nearby = newNearby;
    return {
    	'content': container,
      'location': info.location,
      'title': info.title,
      'shortTitle': info.shortTitle,
      'nearby': nearby
    }
  }
  
  function query(input, assumption, color, recurse, callback, firstCallback) {
  	if (assumption)
  		assumption = '*C.' + input + '-_*' + assumption + '-';
    $.get(QUERY_URL, {
      input: input,
      assumption: assumption
    }, function(data, textStatus, jqXHR) {
      var info = createInfo(data);
      if (info.location) {
	      var marker = new StyledMarker({
	      	styleIcon: new StyledIcon(StyledIconTypes.BUBBLE, {
	      		'color': color,
	      		text: info.shortTitle
	      	}),
	      	position: new google.maps.LatLng(info.location[0], info.location[1]),
	      	map: map
	      });
	      markers.push(marker);
	      google.maps.event.addListener(marker, 'click', function() {
	      	if (openWindow)
	      		openWindow.close();
	      	var infoWindow = new google.maps.InfoWindow({
	      		content: info.content
	      	});
	      	infoWindow.open(map, marker);
	      	openWindow = infoWindow;
	      });
	      var positions = [marker.getPosition()];
	      if (firstCallback) {
	      	firstCallback(marker);
	      }
	      if (recurse && recurse > 0) {
	      	var left = info.nearby.length;
	      	$(info.nearby).each(function(index, nearby) {
	      		var color = '#FF0000';
	      		var assumption = '';
	      		switch (nearby.type) {
	      		case 'city':
	      			color = '#FF9D27';
	      			assumption = 'City';
	      			break;
	      		case 'nuclear power site':
	      			color = '#ADDE4E';
	      			assumption = 'NuclearReactor';
	      			break;
	      		case 'mountain':
	      			color = '#A8877E';
	      			assumption = 'Mountain';
	      			break;
	      		case 'waterfall':
	      			color = '#ADCCD9';
	      			assumption = 'Waterfall';
	      			break;
	      		case 'dam':
	      			color = '#7893AD';
	      			assumption = 'Dam';
	      			break;
	      		case 'airport':
	      			color = '#FFFFB1';
	      			assumption = 'Airport';
	      			break;
	      		case 'hospital':
	      			color = '#A62A16';
	      			assumption = 'Hospital';
	      			break;
	      		}
	      		query(nearby.name, assumption, color, recurse - 1, function(success, newMarker, newPositions) {
	      			--left;
	      			$(newPositions).each(function(index, pos) {
	      				positions.push(pos);
	      			});
	      			if (left <= 0 && callback)
	    	      	callback(true, marker, positions);
	      		});
	      	})
    			if (left <= 0 && callback)
  	      	callback(true, marker, positions);
	      }
	      else if (callback)
	      	callback(true, marker, positions);
      } else
      	if (callback)
      		callback(false, null, []);
    }, 'xml');
  }

  $('#search_form').submit(function() {
  	$('#welcome').hide();
  	$('#noresults').hide();
  	$('#submit').hide();
  	$('#loading').show();
  	$(markers).each(function(index, marker) {
  		marker.setMap(null);
  	})
  	markers = [];
  	query($('#search').val(), '', '#FF4122', 1, function(success, marker, positions) {
  		if (success) {
	  		var bounds = new google.maps.LatLngBounds();
	  		$(positions).each(function(index, pos) {
	  			bounds.extend(pos);
	  		})
	  		marker.setZIndex(10000);
	  		map.fitBounds(bounds);
	  		google.maps.event.trigger(marker, 'click');
  		} else {
  			$('#noresults').show();
  		}
  		$('#loading').hide();
  		$('#submit').show();
  	}, function(marker) {
  		map.setCenter(marker.getPosition());
  	});
    return false;
  })
  
  $(window).ready(function() {
  	$('#search').focus();
  })
})

})();

function submit() {
  $('#search_form').submit();
}

function example(input) {
	$('#search').val(input);
	$('#search_form').submit();
}

function terms() {
	$('#terms').toggle();
	$('#search_container').toggleClass('terms');
}
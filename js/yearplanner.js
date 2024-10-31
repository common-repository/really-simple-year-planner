/*****************************************************
** Name:        yearplanner.js
** Author:      David Thompson
** Version:     1.1
** Plugin:      Year Planner
** Description: Display diary entries on Year Planner
*****************************************************/

// Declare our JQuery Alias
jQuery( 'document' ).ready( function( $ ) {
    var obj = new Object();
    var nowupdatingid = 0;      // ID of post that is being updated in form, zero indicates new entry is being added
    var OKtoDrawBars = false;
    var newbarobj = {
        startdate: '2021-01-01',
        enddate: '2021-01-01',
        recurring: false,
        yplcolor: '#B2CDD6',
        title: "",
        setOK: false,
        id: 0,
    };
    var selectedbarid = "";
    var allbars = [];
    var selectedbars = [];
    var allcells = [];
    var dateonload = new Date();
    
    // Save initial year. This could be updated via the control button
    var displayedyear = ypl_vars.year;
    
    // Initialize the container object and array of all day slots
    var yplgridclk = document.getElementById('yplcontainerid');
    if ( yplgridclk ) {
        allcells = [].slice.call(yplgridclk.querySelectorAll('.yplday'), 0); // get all grid items inside container, and convert to array
    }
    
    // Set date picker fields to current date
    var stfield = document.getElementById('yplformstartid')
    if ( stfield ) {
        stfield.value = new Date().toDateInputValue();
    }
    var enfield = document.getElementById('yplformendid')
    if ( enfield ) {
        enfield.value = new Date().toDateInputValue();
    }
    var colfield = document.getElementById('yplformcolorid')
    if ( colfield ) {
        colfield.value = ypl_vars.defaultcolor;
    }
    
    
    // Set the height of each month according to the viewport width
    setHeights(); 
        
    // set up helper array showing the location of the first of each month (so that weekends align)
    // indent is the position of the first date cell, counting from 0, which equals the number of spacer cells.
    // eg   offsets[11].indent  or  offsets[11].numdays
    var offsets = getOffsetsArray( displayedyear );
        
    // Draw in date labels and weekend shading for current year
    setupPlanner( displayedyear, offsets, allcells );
    
    // Trigger today cell to update every 10 minutes
    setInterval( function() {
        var now = new Date();
        if ( now.getDate() !== dateonload.getDate() ) {
            // The date has changed since page load
            location.reload();
        }
    }, 600000 );
    
    // set up grid array to store status info on each day:    yplgrid [month] [cell position] [ date/bands/type ]  where bands = [bool,bool,bool,bool]
    // eg  yplgrid[11][25].date    or   yplgrid[11][25].bands[2]
    // NB in yplgrid[a][b], 'a' is the month counting from 0 (ie, Jan = 0), and 'b' does NOT equal the date becasue of the indent on each month
    var yplgrid = getGridArray( displayedyear, offsets );

    
    // Get diary entries from Ajax request
    $.ajax( {
        url: ypl_ajax_obj.ajax_url,
        type: 'POST',
        data: {
            action: 'ypl_submit_selection',
            security: ypl_ajax_obj.security,
            'mode': '10',       // my code for read only
            'year': displayedyear,          // the displayed year may be different to that originally supplied by the server
            'data': "",
        },
        success: function( results ) {
            if ( results.success ) {
                if ( results.data == 'No entries to send' ) {
                    obj = [];
                }
                else { 
                    obj = results.data.map(function(e) {return e;});            // copy array in case window resizes

                    // Step through diary entries adding them to planner
                    for ( var en = 0; en < results.data.length; en++ ) {
                        addBar( results.data[en], offsets, yplgrid, displayedyear );
                    }
                }

                OKtoDrawBars = true;
                if ( yplgridclk ) {
                    allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Set array of all bar objects
                }
            }
            else {
                console.log( 'Returned fail code from AJAX' );
                window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
            }
        },
        error: function( erdata ) {
             // Server replied to say that an error occured
            console.log( 'Returned error from AJAX' );
            console.log( erdata );  
            window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
        }
    });

    
    //
    // Callback function for window resize event
    //
    window.addEventListener("resize", function(e) {
        var waittorefresh;
        clearTimeout(waittorefresh);
        waittorefresh = setTimeout(  
            function() {     
                setHeights();
                if ( OKtoDrawBars ) {
                    // First delete all the bars
                    var barelems = document.getElementsByClassName('yplbar');
                    while( barelems[0] ) {
                        // List updates dynamically, so keep deleting first element until no first element exists
                        barelems[0].parentNode.removeChild(barelems[0]);
                    }
                    for (var m = 0; m < yplgrid.length; m++) {
                        for (var d = 0; d < yplgrid[m].length; d++) {
                            yplgrid[m][d].bands = [false, false, false, false];
                        }
                    }

                    // Step through diary entries adding them to planner
                    for ( var en = 0; en < obj.length; en++ ) {
                        addBar( obj[en], offsets, yplgrid, displayedyear );
                    }         
                    
                    if ( yplgridclk ) {
                        allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Get array of all bar objects
                    }

                }
            },
            100         // only refresh this many ms after resize
        );        
    });

    //
    // Callback function for double-click: Create a new planner entry taking start date from the date that was clicked
    //
    $(document).on( 'dblclick', '#yplcontainerid', function(e) {
        if ( nowupdatingid ) return;        // User has double-clicked a bar, so don't run 'add'entry' process
        
        var index = allcells.indexOf( e.target );
        var clkdate = getclickdate( index, offsets, displayedyear );
        
        var formelem = document.getElementById('yplformcontainerid');

        if ( formelem ) {         
            // Display appropriate text for mode
            $('#yplformtextupdateid').hide();
            $('#yplformtextaddid').show();
            $('#yplbuttonsubmitid').html( ypl_translate.submit );

            formelem.style.display = 'initial';
        }

        var stobj = document.getElementById('yplformstartid');
        if ( stobj ) {
            stobj.value = clkdate;
        }
        var enobj = document.getElementById('yplformendid');
        if ( enobj ) {
            enobj.value = clkdate;
        }        
    });
    
    //
    // Callback function for Cancel button click: simply close the form
    //
    $(document).on( 'click', '#yplbuttoncancelid', function() {         // Use 'on' form cos element is hidden on page load
        var formelem = document.getElementById('yplformcontainerid');
        if ( formelem ) {
            formelem.style.display = 'none';
        }
        nowupdatingid = 0;
    });
    
    //
    // Callback function for Submit button click: send new diary entry information to server and redraw
    //
    $(document).on( 'click', '#yplbuttonsubmitid', function() {         // Use 'on' form cos element is hidden on page load
        // Send new planner entry and retrieve all entries again
        var submitstart = new Date($('#yplformstartid').val());
        var submitend = new Date($('#yplformendid').val());
        if ( submitstart && submitend ) {   
            newbarobj.startdate = $('#yplformstartid').val();
            newbarobj.enddate = $('#yplformendid').val();
            newbarobj.yplcolor = $('#yplformcolorid').val();
            newbarobj.recurring = $('#yplformrecurringid').prop('checked');
            newbarobj.title = $('#yplformtitleid').val();
            newbarobj.setOK = true;
            newbarobj.id = nowupdatingid.toString();
            var newbarJSON = JSON.stringify( newbarobj );
            
            var wrmode;
            if ( nowupdatingid ) {
                wrmode = '40';          // my code for update entry
            }
            else {
                wrmode = '20';          // my code for add new entry
            }
            
            $.ajax( {
                url: ypl_ajax_obj.ajax_url,
                type: 'POST',
                data: {
                    action: 'ypl_submit_selection',
                    security: ypl_ajax_obj.security,
                    'mode': wrmode,         
                    'year': displayedyear,          // the displayed year may be different to that originally supplied by the server
                    'data': newbarJSON,
                },
                success: function( results ) {
                    if ( results.success ) { 
                        
                        if ( wrmode == '20' ) { 
                            // Simply add the new bar to the DOM
                            if ( newbarobj.setOK ) {
                                newbarobj.id = results.data;
                                addBar( newbarobj, offsets, yplgrid, displayedyear );
                                newbarobj.setOK = false;
                            }  

                            // Add new bar to stored array of entries so it redraws, eg, if window resizes
                            obj.push( newbarobj );
                            if ( yplgridclk ) {
                                allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Get array of all bar objects
                            }
                        }
                        else {
                            // Complete redraw, ie, delete all bars and add them again from new Ajax data

                            // First delete all the bars
                            var barelems = document.getElementsByClassName('yplbar');
                            while( barelems[0] ) {
                                // List updates dynamically, so keep deleting first element until no first element exists
                                barelems[0].parentNode.removeChild(barelems[0]);
                            }
                            for (var m = 0; m < yplgrid.length; m++) {
                                for (var d = 0; d < yplgrid[m].length; d++) {
                                    yplgrid[m][d].bands = [false, false, false, false];
                                }
                            }

                            if ( results.data == 'No entries to send' ) {
                                obj = [];
                            }
                            else { 
                                // Now generate all bars again from server data
                                //
                                obj = results.data.map(function(e) {return e;});            // copy array in case window resizes

                                // Step through diary entries adding them to planner
                                for ( var en = 0; en < results.data.length; en++ ) {
                                    addBar( results.data[en], offsets, yplgrid, displayedyear );
                                }
                            }

                            OKtoDrawBars = true;
                            if ( yplgridclk ) {
                                allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Set array of all bar objects
                            }    
                            
                            nowupdatingid = 0;
                        }
                    }
                    else {
                        console.log( results.data );
                        window.alert( 'Sorry, it was not possible to add an entry at this time. Try reloading the page first.' );
                        nowupdatingid = 0;
                    }
                },
                error: function( erdata ) {
                     // Server replied to say that an error occured
                    console.log( 'Returned error from AJAX' );
                    console.log( erdata );  
                    window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
                    newbarobj.setOK = false;
                    nowupdatingid = 0;
                }
            });
        }
         
        var formsubelem = document.getElementById('yplformcontainerid');
        if ( formsubelem ) {
            formsubelem.style.display = 'none';
        }

    });

    //
    // Callback function for clicking on a planner entry: toggle selection, shading all bars comprising this planner entry
    //
    if ( yplgridclk && ypl_vars.canedit ) {
        
        // add click event anywhere on planner
        var pid;
        yplgridclk.addEventListener( 'click', function(e) {
            // Find the index of the clicked bar
            var index = allbars.indexOf( e.target );
            
            if ( index !== -1 ) {           // -1 is returned if the planner was clicked away from any bars, so deselect if necessary
                var prevselbarid = selectedbarid;
                
                if ( selectedbarid !== '' ) {
                    // deselect the currently selected bar
                    while ( selectedbars.length ) {
                        selectedbars[0].style.backgroundImage = 'none';
                        selectedbars.splice(0, 1);
                    }            
                    selectedbarid = '';
                }
                
                var clist = e.target.className;
                // find id in class list
                var idpos = clist.indexOf('wpid');
                if ( idpos !== -1 ) {       // The bar did not contain a wpidxxxx classname. This is a fault condition.
                    pid = parseInt( clist.substring( idpos + 4 ) );
                    selectedbarid = 'wpid' + pid;
                    
                    // Unless the clicked bar was previously selected, select the newly clicked bar
                    if ( prevselbarid !== selectedbarid ) {
                        // Build array of bars in this entry and shade them at the same time
                        for ( var tb of allbars ) {
                            if ( tb.classList.contains( selectedbarid ) ) {
                                selectedbars.push( tb );
                                var tbcolor = tb.style.backgroundColor;
                                var hatchcolor = pickTextColorBasedOnBgColorSimple( tbcolor, '#ffffff', '#000000' );
                                var hatch = 'repeating-linear-gradient(-45deg,' + tbcolor + ',' + tbcolor + ' 5px,' + hatchcolor + ' 7px,' + hatchcolor + ' 8px)';
                                tb.style.backgroundImage = hatch;
                            }
                        }
                    }
                    else {
                        selectedbarid = '';
                    }
                }
            }
            else {
                // remove class names for selected bars
                if ( selectedbarid !== '' ) {
                    // deselect the currently selected bar
                    while ( selectedbars.length ) {
                        selectedbars[0].style.backgroundImage = 'none';
                        selectedbars.splice(0, 1);
                    }            
                    selectedbarid = '';
                }
            }           
        });     // End of click event listener

        //
        // Callback function for double-clicking on a planner entry: display form to update entry details
        //
        yplgridclk.addEventListener( 'dblclick', function(e) {
            // Find the index of the clicked bar
            var index = allbars.indexOf( e.target );
            
            if ( index !== -1 ) {           // -1 is returned if the planner was clicked away from any bars, so deselect if necessary
                var prevselbarid = selectedbarid;
                
                if ( selectedbarid !== '' ) {
                    // deselect the currently selected bar
                    while ( selectedbars.length ) {
                        selectedbars[0].style.backgroundImage = 'none';
                        selectedbars.splice(0, 1);
                    }            
                    selectedbarid = '';
                }
                
                var clist = e.target.className;
                // find id in class list
                var idpos = clist.indexOf('wpid');
                if ( idpos !== -1 ) {       // The bar did not contain a wpidxxxx classname. This is a fault condition.
                    pid = parseInt( clist.substring( idpos + 4 ) );
                    selectedbarid = 'wpid' + pid;
                    
                    // Build array of bars in this entry and shade them at the same time
                    // NB There is no toggle effect for double click, ie, select it whether or not it was previously selected
                    for ( var tb of allbars ) {
                        if ( tb.classList.contains( selectedbarid ) ) {
                            selectedbars.push( tb );
                            var tbcolor = tb.style.backgroundColor;
                            var hatchcolor = pickTextColorBasedOnBgColorSimple( tbcolor, '#ffffff', '#000000' );
                            var hatch = 'repeating-linear-gradient(-45deg,' + tbcolor + ',' + tbcolor + ' 5px,' + hatchcolor + ' 7px,' + hatchcolor + ' 8px)';
                            tb.style.backgroundImage = hatch;
                        }
                    }

                    // Find entry information
                    var en;
                    var foundidx = -1;
                    for ( en = 0; en < obj.length; en++ ) {
                        if ( obj[en].id == pid ) {
                            foundidx = en;
                            break;
                        }
                    }
                    
                    if ( foundidx == -1 ) return;    // Fault condition. There is no reason that the entry should not be found.
                    
                    // Prepare form and show
                    var formelem = document.getElementById('yplformcontainerid');
                    if ( formelem ) {
                        nowupdatingid = pid;
                        // Display appropriate text for this mode
                        $('#yplformtextaddid').hide();
                        $('#yplformtextupdateid').show();
                        $('#yplbuttonsubmitid').html( ypl_translate.update );

                        $('#yplformstartid').val(obj[foundidx].startdate);
                        $('#yplformendid').val(obj[foundidx].enddate);
                        $('#yplformtitleid').val(obj[foundidx].title);
                        $('#yplformcolorid').val(obj[foundidx].yplcolor);
                        $('#yplformrecurringid').prop("checked", obj[foundidx].recurring);
                    
                        formelem.style.display = 'initial';
                    }                     

                    // Remaining process is handled by Submit button event listener
                }
            }
            else {
                // remove class names for selected bars
                if ( selectedbarid !== '' ) {
                    // deselect the currently selected bar
                    while ( selectedbars.length ) {
                        selectedbars[0].style.backgroundImage = 'none';
                        selectedbars.splice(0, 1);
                    }            
                    selectedbarid = '';
                }
            }           

        });     // End of double click event listener
                
    }
    
    //
    // Callback function for Delete control button click event: remove selected planner entry
    //
    var delctl = document.getElementById('yplcontroldeleteid');
    if ( delctl ) {
        delctl.addEventListener( 'click', function(e) {
            if ( selectedbarid !== '' ) {
                // There is a bar selected, so remove it from the server
                $.ajax( {
                    url: ypl_ajax_obj.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'ypl_submit_selection',
                        security: ypl_ajax_obj.security,
                        'mode': '30',                   // my code for delete entry
                        'year': displayedyear,          // the currently displayed year
                        'data': selectedbarid,          // send the ID of the selected bar, so the server can find it in the database
                    },
                    success: function( results ) {
                        if ( results.success ) { 
                            // Complete redraw, ie, delete all bars and add them again from new Ajax data

                            // First delete all the bars
                            var barelems = document.getElementsByClassName('yplbar');
                            while( barelems[0] ) {
                                // List updates dynamically, so keep deleting first element until no first element exists
                                barelems[0].parentNode.removeChild(barelems[0]);
                            }
                            for (var m = 0; m < yplgrid.length; m++) {
                                for (var d = 0; d < yplgrid[m].length; d++) {
                                    yplgrid[m][d].bands = [false, false, false, false];
                                }
                            }

                            if ( results.data == 'No entries to send' ) {
                                obj = [];
                            }
                            else { 
                                // Now generate all bars again from server data
                                //
                                obj = results.data.map(function(e) {return e;});            // copy array in case window resizes

                                // Step through diary entries adding them to planner
                                for ( var en = 0; en < results.data.length; en++ ) {
                                    addBar( results.data[en], offsets, yplgrid, displayedyear );
                                }
                            }

                            OKtoDrawBars = true;
                            if ( yplgridclk ) {
                                allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Set array of all bar objects
                            }    
                        }
                        else {
                            console.log( results.data );
                            window.alert( 'Sorry, it was not possible to delete the entry. Try reloading the page first.' );
                        }
                    },
                    error: function( erdata ) {
                         // Server replied to say that an error occured
                        console.log( 'Returned error from AJAX' );
                        console.log( erdata );  
                        window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
                        newbarobj.setOK = false;
                    }
                });

            }
        });
    }
    
    //
    // Callback function for Add control button click event: display new entry form
    //
    var addctl = document.getElementById('yplcontroladdid');
    if ( addctl ) {
        addctl.addEventListener( 'click', function(e) {
            var formelem = document.getElementById('yplformcontainerid');
            if ( formelem ) {                
                $('#yplformtextupdateid').hide();
                $('#yplformtextaddid').show();
                $('#yplbuttonsubmitid').html( ypl_translate.submit );

                var dt = new Date();
                $('#yplformstartid').val(dt.toDateInputValue());
                $('#yplformendid').val(dt.toDateInputValue());
                formelem.style.display = 'initial';
            }                     
        });
    }

    //
    // Callback function for Previous Year control button click event: decrement year and redraw
    //
    var prevctl = document.getElementById('yplcontrolpreviousid');
    if ( prevctl ) {
        prevctl.addEventListener( 'click', function(e) {
            // Decrease year by one and ensure it stays in a sensible range
            var intyear = parseInt(displayedyear) - 1;
            if ( intyear < 1900 ) intyear = 1900;
            displayedyear = intyear.toString();
            
            offsets = getOffsetsArray( displayedyear );

            // Draw in date labels and weekend shading for current year
            setupPlanner( displayedyear, offsets, allcells );

            // set up grid array to store status info on each day
            yplgrid = getGridArray( displayedyear, offsets );


            // Get diary entries from Ajax request
            $.ajax( {
                url: ypl_ajax_obj.ajax_url,
                type: 'POST',
                data: {
                    action: 'ypl_submit_selection',
                    security: ypl_ajax_obj.security,
                    'mode': '10',                   // my code for read only
                    'year': displayedyear,          // The displayed year has now been decremented
                    'data': "",                     // No data to send in this mode
                },
                success: function( results ) {
                    if ( results.success ) {

                        // Delete all the bars from the previously displayed year
                        var barelems = document.getElementsByClassName('yplbar');
                        while( barelems[0] ) {
                            // List updates dynamically, so keep deleting first element until no first element exists
                            barelems[0].parentNode.removeChild(barelems[0]);
                        }

                        if ( results.data == 'No entries to send' ) {
                            obj = [];
                        }
                        else { 
                            obj = results.data.map(function(e) {return e;});            // copy array in case window resizes

                            // Step through diary entries adding them to planner
                            for ( var en = 0; en < results.data.length; en++ ) {
                                addBar( results.data[en], offsets, yplgrid, displayedyear );
                            }
                        }

                        OKtoDrawBars = true;
                        if ( yplgridclk ) {
                            allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Set array of all bar objects
                        }
                    }
                    else {
                        console.log( 'Returned fail code from AJAX' );
                        window.alert( 'Sorry, it was not possible to get the Year Planner entries. Try reloading the page.' );
                    }
                },
                error: function( erdata ) {
                     // Server replied to say that an error occured
                    console.log( 'Returned error from AJAX' );
                    console.log( erdata );    
                    window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
                }
            });                
        });
    }
    
    //
    // Callback function for Next Year control button click event: increment year and redraw
    //
    var nextctl = document.getElementById('yplcontrolnextid');
    if ( nextctl ) {
        nextctl.addEventListener( 'click', function(e) {
            // Increase year by one and ensure it stays in a sensible range
            var intyear = parseInt(displayedyear) + 1;
            if ( intyear > 2300 ) intyear = 2300;
            displayedyear = intyear.toString();
            
            offsets = getOffsetsArray( displayedyear );

            // Draw in date labels and weekend shading for current year
            setupPlanner( displayedyear, offsets, allcells );

            // set up grid array to store status info on each day
            yplgrid = getGridArray( displayedyear, offsets );


            // Get diary entries from Ajax request
            $.ajax( {
                url: ypl_ajax_obj.ajax_url,
                type: 'POST',
                data: {
                    action: 'ypl_submit_selection',
                    security: ypl_ajax_obj.security,
                    'mode': '10',                   // my code for read only
                    'year': displayedyear,          // The displayed year has now been incremented
                    'data': "",                     // no data to send in this mode
                },
                success: function( results ) {
                    if ( results.success ) {

                        // Delete all the bars from the previously displayed year
                        var barelems = document.getElementsByClassName('yplbar');
                        while( barelems[0] ) {
                            // List updates dynamically, so keep deleting first element until no first element exists
                            barelems[0].parentNode.removeChild(barelems[0]);
                        }

                        if ( results.data == 'No entries to send' ) {
                            obj = [];
                        }
                        else { 
                            obj = results.data.map(function(e) {return e;});            // copy array in case window resizes

                            // Step through diary entries adding them to planner
                            for ( var en = 0; en < results.data.length; en++ ) {
                                addBar( results.data[en], offsets, yplgrid, displayedyear );
                            }
                        }

                        OKtoDrawBars = true;
                        if ( yplgridclk ) {
                            allbars = [].slice.call( yplgridclk.querySelectorAll('.yplbar'), 0 );        //  Set array of all bar objects
                        }
                    }
                    else {
                        console.log( 'Returned fail code from AJAX' );
                        window.alert( 'Sorry, it was not possible to get the Year Planner entries. Try reloading the page.' );
                    }
                },
                error: function( erdata ) {
                     // Server replied to say that an error occured
                    console.log( 'Returned error from AJAX' );
                    console.log( erdata );
                    window.alert( 'Sorry, it was not possible to get the Year Planner entries.' );
                }
            });
        });
    }
    
    //
    // Callback function date input field change event: When the date fields on the form are changed, ensure that the end date is >= the start date
    //
    $('#yplformstartid').change( function(e) {
        var st = new Date($('#yplformstartid').val()); 
        if (isNaN(st.getTime())) return;
        var en = new Date($('#yplformendid').val()); 
        if (isNaN(en.getTime())) return;
        
        if ( en < st ) {
            // Change the end date to equal the start date
            $('#yplformendid').val(st.toDateInputValue());
        }
    } );

    //
    // Callback function date input field change event: When the date fields on the form are changed, ensure that the end date is >= the start date
    //
    $('#yplformendid').change( function(e) {
        var st = new Date($('#yplformstartid').val()); 
        if (isNaN(st.getTime())) return;
        var en = new Date($('#yplformendid').val()); 
        if (isNaN(en.getTime())) return;
        
        if ( en < st ) {
            // Change the start date to equal the end date
            $('#yplformstartid').val(en.toDateInputValue());
        }
    } );

    //
    // END OF DOCUMENT READY
    //
});


/********************************************************************************
*******  Function: getOffsetsArray
*******  Parameters: currently displayed year
*******  Returns: array of horizontal offsets and number of days for each month
*******  Comments: 
********************************************************************************/
function getOffsetsArray( displayedyear ) {
    var offsets = new Array(12);
    var thisdate = new Date( displayedyear, 0, 1 );   // year, month-1, date
    for (var i = 0; i < offsets.length; i++) {
        offsets[i] = { indent: 0, numdays: 0 };
        var dayst = thisdate.getDay();
        if ( dayst == 0 ) {
            // Sunday has the value of 0
            offsets[i].indent = 6;          // indent is the number of spacer cells: 6 for Sunday
        }
        else {
            offsets[i].indent = dayst - 1;  // Monday is the first day of our week, with zero indent; Tuesday has 1; Wed has 2; etc     
        }

        // To determine the number of days in each month, step a temporary variable along the month until the month changes
        var daysinmonth = 0;
        var stepd = new Date(thisdate.getTime());
        while ( thisdate.getMonth() == stepd.getMonth() ) {
            daysinmonth++;
            stepd.setDate( stepd.getDate() + 1 );
        }
        offsets[i].numdays = daysinmonth;

        thisdate.setMonth( thisdate.getMonth() + 1 );
    }
    return offsets;
}

/********************************************************************************
*******  Function: getGridArray
*******  Parameters: currently displayed year; array of month offsets
*******  Returns: array of every date cell showing status information
*******  Comments: yplgrid [month] [cell position] [ date/bands/type ]  where bands = [bool,bool,bool,bool]
********************************************************************************/
function getGridArray( displayedyear, offsets ) {
    var yplgrid = new Array(12);
    var tdate = new Date( displayedyear, 0, 1 );
    for (var m = 0; m < yplgrid.length; m++) {
        yplgrid[m] = new Array(37);
        for (var d = 0; d < yplgrid[m].length; d++) {
            if ( d < offsets[m].indent || d >= offsets[m].indent + offsets[m].numdays ) { 
                // spacer cells
                yplgrid[m][d] = { date: null, bands: [false, false, false, false], type: 'spacer' };
            }
            else {
                // valid date cells
                yplgrid[m][d] = { date: new Date(tdate.getTime()), bands: [false, false, false, false], type: 'valid' };
                tdate.setDate( tdate.getDate() + 1 );
            }
        }
    }
    return yplgrid;
}

/********************************************************************************
*******  Function: setupPlanner
*******  Parameters: currently displayed year; array of month offsets; array of date status objects
*******  Returns: n/a
*******  Comments: Adds the date labels, weekend colours and 'today' highlight
********************************************************************************/
function setupPlanner( displayedyear, offsets, allcells ) {      
    var idx = 0;
    for (var m = 0; m < 12; m++) {
        dx = 0;
        while ( dx < offsets[m].indent ) {
            // Ensure that date value is blank (NB, we may be overwriting previous values when the year is changed)
            allcells[idx].innerHTML = '';

            // set class to 'spacer'
            allcells[idx].className = 'yplday spacer';
            
            dx++;
            idx++;
        }
        var day = 1;
        while ( dx < offsets[m].indent + offsets[m].numdays ) {
            // Write the date into the cell
            allcells[idx].innerHTML = day;
            
            // set class to 'weekday' or 'weekend'
            var zero_sat = (dx + 2) % 7;            // equates to zero when dx falls on a Saturday
            var zero_sun = (dx + 1) % 7;            // equates to zero when dx falls on a Sunday
            if ( !zero_sat || !zero_sun ) {
                // weekend
                allcells[idx].className = 'yplday weekend';
            }
            else {
                // weekday
                allcells[idx].className = 'yplday weekday';
            }
            
            day++;
            dx++;
            idx++;
        }
        while ( dx < 37 ) {
            // Ensure that date value is blank (NB, we may be overwriting previous values when the year is changed)
            allcells[idx].innerHTML = '';

            // set class to 'spacer'
            allcells[idx].className = 'yplday spacer';
            
            dx++;
            idx++;
        }
    }
    // Find today and add class name
    setToday( displayedyear, offsets, allcells );

    // Update year label
    var yearlab = document.getElementById('yplyearlabelid');
    if (yearlab) {
        yearlab.innerHTML = displayedyear;
    }
}

function setToday( displayedyear, offsets, allcells ) {
    if ( !allcells.length ) return;     // just in case the new day routine fired before the page was initialised
    
    // remove existing today cell
    var prevtoday = document.getElementsByClassName('today');
    while ( prevtoday[0] ) {
        prevtoday[0].classList.remove('today');
        prevtoday = document.getElementsByClassName('today');
    }
    
    // add new today cell
    var todaycell = new Date();
    if ( todaycell.getFullYear() == displayedyear ) {
        // 'today' is on the current view somewhere
        var mtod = todaycell.getMonth();
        var dtod = todaycell.getDate();
        var idxtod = mtod*37 + ( offsets[mtod].indent + dtod - 1 );
        allcells[idxtod].classList.add('today');
    }    
}

/********************************************************************************
*******  Function: setHeights
*******  Parameters: n/a
*******  Returns: n/a
*******  Comments: Sets the height of the year planner as a ratio of its width
********************************************************************************/
function setHeights() {
    const heightratio = 1.7;

    var dy = document.getElementsByClassName('yplday');
    var htfirst = ( dy[0].offsetWidth * heightratio ).toString();

    for (var i=0; i<dy.length; i++) {
        var newht = htfirst + 'px';
        dy[i].style.height = newht;
    }    
}

/********************************************************************************
*******  Function: addBar
*******  Parameters: data relating to new entry, array of month offsets, array of date status objects, current year
*******  Returns: n/a
*******  Comments: Adds all the bars for a new entry selecting the first available position (out of four)
********************************************************************************/
function addBar( entry, offsets, yplgrid, displayedyear ) {
    var dy = document.getElementsByClassName('yplday');

    var startobj = new Date( Date.parse( entry.startdate ) );     // Date.parse is not recommended as it is implementation specific. However, our format is simple and we have control of both client and server code within plugin 
    var endobj = new Date( Date.parse( entry.enddate ) );
    
    // dates must start in the current year unless recurring
    if ( startobj.getFullYear().toString() !== displayedyear && !entry.recurring ) return;
    
    // For recurring entries, set date to current year else leap years could go wrong
    if ( entry.recurring ) {
        var yeardiff = endobj.getFullYear() - startobj.getFullYear();
        startobj.setFullYear( displayedyear );
        endobj.setFullYear( displayedyear + yeardiff );
    }
    
    // determine first available position (1..4)
    var pos = 1;
    
    var startmonth = startobj.getMonth();
    var endmonth = endobj.getMonth();
    var startthismonth = startmonth;
    var endthismonth = endmonth;
    var allbarsdone = false;
    var starttempdate;
    var endtempdate;
    var firstbar = true;
    
    var bars = [];
    
    while ( !allbarsdone ) {
        var posused = [false, false, false, false];
        
        if ( startmonth == endmonth ) {
            // Entry is full contained in one month
            starttempdate = new Date(startobj.getTime());
            endtempdate = new Date(endobj.getTime());    
            
            firstbar = true;
            allbarsdone = true;
        }
        else if ( startmonth == startthismonth ) {
            // Entry starts in this month but continues into next
            starttempdate = new Date(startobj.getTime());
            endtempdate = new Date(startobj.getTime());    
            if (endtempdate.getMonth() == 11) {
                endtempdate.setDate(31);                              // If month is Dec, simply set to 31st
            }
            else {
                endtempdate.setDate(1);
                endtempdate.setMonth(endtempdate.getMonth() + 1);     // Move to first of next month
                endtempdate.setDate(endtempdate.getDate() - 1);       // Step back one day to last day of previous month
            }
            firstbar = true;
        }
        else if ( endmonth == startthismonth ) {
            // Entry finishes in this month but began in previous month
            starttempdate = new Date(endobj.getTime());           // Set start equal to end and then step to 1st of month
            starttempdate.setDate(1);
            
            endtempdate = new Date(endobj.getTime());  
            firstbar = false;
            allbarsdone = true;
        }
        else {
            // Entry continues right through this mnonth
            starttempdate = new Date(startobj.getYear(), startthismonth, 1);
            endtempdate = new Date(starttempdate.getTime());
            if (endtempdate.getMonth() == 11) {
                endtempdate.setDate(31);
            }
            else {
                endtempdate.setDate(1);
                endtempdate.setMonth(endtempdate.getMonth() + 1);     // Move to first of next month
                endtempdate.setDate(endtempdate.getDate() - 1);       // Step back one day to last day of previous month
            }
            firstbar = false;
        }
        
        var startelem = starttempdate.getMonth() * 37 + starttempdate.getDate() + offsets[starttempdate.getMonth()].indent - 1;
        var endelem = endtempdate.getMonth() * 37 + endtempdate.getDate() + offsets[endtempdate.getMonth()].indent - 1;

        var leftfirst = dy[startelem].offsetLeft;
        var leftlast = dy[endelem].offsetLeft;
        var tsw = leftlast - leftfirst;

        var ht = dy[startelem].clientHeight;
        var wt = 0.5 * (dy[endelem].offsetWidth - dy[endelem].clientWidth) + dy[endelem].clientWidth;       // Use clientWidth (rather than offsetWidth) to EXCLUDE boder width, so bar ends short of final border
        //var pos = 1;
        var bar;
        if ( firstbar && ypl_vars.showtitles ) {
            fontcolor = pickTextColorBasedOnBgColorSimple( entry.yplcolor, '#ffffff', '#000000' );
            bar = '<div class="yplbar titled wpid' + entry.id + '" style="left:0px;top:XXXpx;width:' + (tsw+wt) + 'px;height:' + ht/6 + 'px;color:' + fontcolor + ';background-color:' + entry.yplcolor + ';font-size:' + (ht/6-2) + 'px;line-height:' + (ht/6-2) + 'px;">' + entry.title + '</div>';     
        } 
        else {
            bar = '<div class="yplbar wpid' + entry.id + '" style="left:0px;top:XXXpx;width:' + (tsw+wt) + 'px;height:' + ht/6 + 'px;background-color:' + entry.yplcolor + ';font-size:' + (ht/6-2) + 'px;line-height:' + (ht/6-2) + 'px;"></div>';                 
        }
        
        // yplgrid[11][31].bands[2]
        // check available slots for this bar mnonth
        for (var dd = starttempdate.getDate(); dd <= endtempdate.getDate(); dd++) {
            for (var slot = 0; slot <= 3; slot++ ) {
                var hindex = dd + offsets[startthismonth].indent - 1;
                if ( yplgrid[startthismonth][hindex].bands[slot] ) {
                    posused[slot] = true;  
                } 
            }
        }
        
        var bardata = { firstdiv: startelem, lastdiv: endelem, pos_used: posused, html: bar };
        bars.push( bardata );
        
        startthismonth++; 
        if ( startthismonth > 11 ) {
            // This diary entry entends beyond the year end, so stop it at 31 Dec
            allbarsdone = true;
        }
    }           // End of while loop processing all bars that make up diary entry
        
    // Find the first available slot for all bars
    var tryslot;
    var trysuccess = true;
    for ( tryslot = 0; tryslot <= 3; tryslot++ ) {
        trysuccess = true;
        bars.forEach( function( el ) {
           if ( el.pos_used[tryslot] ) {
               // on one particular bar, this slot was found to be occupied already
               trysuccess = false;
           } 
        });
        if ( trysuccess ) {
            // slot n has a space so no point checking n+1, n+2, ...
            break;
        }
    }
    
    if ( !trysuccess ) {
        // There were no available bar spaces, so indicate that next to the date number
        dy[bars[0].firstdiv].innerHTML = dy[bars[0].firstdiv].innerHTML + '...';
    }
    else {        
        // Now print all stored bars
        var top = (tryslot + 1.7) * ht/6;
        
        bars.forEach( function( el ) { 
            el.html = el.html.replace( 'XXX', top.toString() );
            dy[el.firstdiv].innerHTML = dy[el.firstdiv].innerHTML + el.html;
            
            // Update yplgrid with used slots
            var mindex = Math.floor( el.firstdiv / 37 );
            var stdindex = el.firstdiv % 37;
            var endindex = el.lastdiv % 37;
            for (var dx = stdindex; dx <= endindex; dx++ ) {
                yplgrid[mindex][dx].bands[tryslot] = true;
            }
        });
    }
    
}

/********************************************************************************
*******  Function: pickTextColorBasedOnBgColorSimple
*******  Parameters: background colour; colour to use if the bg is dark; colour to use if the bg is light
*******  Returns: either lightColor or darkColor
*******  Comments: Allowed fornats for bgColor: rgb(r,g,b);  rgb(r g b);  RRGGBB  ; #RRGGBB
********************************************************************************/
function pickTextColorBasedOnBgColorSimple(bgColor, lightColor, darkColor) {
  var col;
  if ( bgColor.indexOf( 'rgb' ) >= 0 ) {
      col = RGBToHex( bgColor );
  }
  else {
      col = bgColor;
  }
  color = (col.charAt(0) === '#') ? col.substring(1, 7) : col;
  var r = parseInt(color.substring(0, 2), 16); // hexToR
  var g = parseInt(color.substring(2, 4), 16); // hexToG
  var b = parseInt(color.substring(4, 6), 16); // hexToB
  return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ?
    darkColor : lightColor;
}

/********************************************************************************
*******  Function: RGBToHex
*******  Parameters: rgb color value
*******  Returns: Hex color value with # prefix
*******  Comments: Supports ',' or ' ' separator
********************************************************************************/
function RGBToHex(rgb) {
  // Choose correct separator
  let sep = rgb.indexOf(",") > -1 ? "," : " ";
  // Turn "rgb(r,g,b)" into [r,g,b]
  rgb = rgb.substr(4).split(")")[0].split(sep);

  let r = (+rgb[0]).toString(16),
      g = (+rgb[1]).toString(16),
      b = (+rgb[2]).toString(16);

  if (r.length == 1)
    r = "0" + r;
  if (g.length == 1)
    g = "0" + g;
  if (b.length == 1)
    b = "0" + b;

  return "#" + r + g + b;
}

/********************************************************************************
*******  Function: toDateInputValue
*******  Parameters: n/a
*******  Returns: Date string
*******  Comments: Converts a date object to a string accepted by HTML date input
********************************************************************************/
Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

/********************************************************************************
*******  Function: isValidDate
*******  Parameters: Object, usually a date object
*******  Returns: true if the supplied object is a valid date object, false otherwise
*******  Comments:
********************************************************************************/
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

/********************************************************************************
*******  Function: getclickdate
*******  Parameters: index into the array of date cell objects that was clicked; array of month offsets, current year
*******  Returns: String representing the date of the cell that was clicked
*******  Comments:
********************************************************************************/
function getclickdate( index, offsets, year ) {
    var dx = index % 37;
    var m = (index - dx) / 37;
    var d;
    
    if ( dx < offsets[m].indent || dx >= ( offsets[m].indent + offsets[m].numdays ) ) {
        d = 0;
    }
    else {
        d = dx - offsets[m].indent;
    }
    m++;
    d++;
    var dt = year + '-' + ('00' + m).slice(-2) + '-' + ('00' + d).slice(-2);
    
    return dt;
}

/********************************************************************************
*******  END OF FILE 
********************************************************************************/


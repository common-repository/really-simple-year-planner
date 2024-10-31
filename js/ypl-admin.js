/*****************************************************
** Name:        ypl-admin.js
** Author:      David Thompson
** Version:     1.0
** Plugin:      Year Planner
** Description: Handles scripts for admin screen
*****************************************************/

jQuery(document).ready(function($){
    $('.ypl-color-field').wpColorPicker();
    
    // When end date changes, if start date is after end date, change start date to equal end date
    $('#yplstdateid').change( function(e) {
        var st = new Date($('#yplstdateid').val()); 
        if (isNaN(st.getTime())) return;
        var en = new Date($('#yplendateid').val()); 
        if (isNaN(en.getTime())) return;
        
        if ( en < st ) {
            $('#yplendateid').val(st.toDateInputValue());
        }
    } );

    // When start date changes, if start date is after end date, change end date to equal start date
    $('#yplendateid').change( function(e) {
        var st = new Date($('#yplstdateid').val()); 
        if (isNaN(st.getTime())) return;
        var en = new Date($('#yplendateid').val()); 
        if (isNaN(en.getTime())) return;
        
        if ( en < st ) {
            $('#yplstdateid').val(en.toDateInputValue());
        }
    } );

});

function RestoreColors() {
    jQuery('#colorentry').wpColorPicker('color', '#ff0000');
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});
<?php
$current_user = wp_get_current_user();
$setcanedit = current_user_can('editor') || current_user_can('administrator') || get_option( 'yplCanEdit' );

if ( $setcanedit ) :
?>
<div class="yplformcontainer" id="yplformcontainerid">
	<div class="yplformtext" id="yplformtextaddid">
		<?php _e('Please submit the following details to add a new entry to your year planner.', 'year-planner'); ?>
	</div>	
	<div class="yplformtext" id="yplformtextupdateid">
		<?php _e('Please submit the following details to update this entry to your year planner.', 'year-planner'); ?>
	</div>	
	<form name="yplform" class="ypl_all_forms" id="yplformid" method="POST">
		<div class="yplentryfields">
			<div class="yplformitem title">				
				<label for="yplformtitleid" class="yplformlabels" id="yplformtitlelabelid"><?php _e('Entry Label:', 'year-planner'); ?></label>
				<input name="yplformtitle" id="yplformtitleid" type="text" value=""/>
			</div>
			<div class="yplformitem date">				
				<label for="yplformstartid" class="yplformlabels" id="yplformstartlabelid"><?php _e('Start Date:', 'year-planner'); ?></label>
				<input name="yplformstart" id="yplformstartid" type="date" value=""/>
			</div>
			<div class="yplformitem date">				
				<label for="yplformendid" class="yplformlabels" id="yplformendlabelid"><?php _e('End Date:', 'year-planner'); ?></label>
				<input name="yplformend" id="yplformendid" type="date" value=""/>
			</div>
			<div class="yplformitem color">
				<label for="yplformcolorid" class="yplformlabels" id="yplformcolorlabelid"><?php _e('Colour:', 'year-planner'); ?></label>
				<input name="yplformcolor" id="yplformcolorid" type="color" value=""/>				
			</div>
			<div class="yplformitem check">
				<label for="yplformrecurringid" class="yplformlabels" id="yplformreucrringlabelid"><?php _e('Recurring:', 'year-planner'); ?></label>
				<input name="yplformrecurring" id="yplformrecurringid" type="checkbox" value=""/>
			</div>
		</div>
		<div class="yplformbuttons">
			<button type="button" class="yplbutton yplsubmit" id="yplbuttonsubmitid"><?php _e('Submit', 'year-planner'); ?></button>
			<button type="button" class="yplbutton yplcancel" id="yplbuttoncancelid"><?php _e('Cancel', 'year-planner'); ?></button>
		</div>		
	</form>
</div>
<?php
endif;
?>
<div class="yplcontrols" id="yplcontrolsid">
    <button type="button" class="yplcontrol previous" id="yplcontrolpreviousid">&lt;</button>
    <div class="yplyearlabel" id="yplyearlabelid"></div>
    <button type="button" class="yplcontrol next" id="yplcontrolnextid">&gt;</button>
<?php
if ( $setcanedit ) :
?>
    <button type="button" class="yplcontrol add" id="yplcontroladdid">&#43;</button>
    <button type="button" class="yplcontrol delete" id="yplcontroldeleteid">&#45;</button>
<?php
endif;
?>
</div>

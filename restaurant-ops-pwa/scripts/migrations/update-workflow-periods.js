// Script to update workflow periods in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdpeoyugsxqnpwwtkqsl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcGVveXVnc3hxbnB3d3RrcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDgwNzgsImV4cCI6MjA1OTcyNDA3OH0.9bUpuZCOZxDSH3KsIu6FwWZyAvnV5xPJGNpO3luxWOE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateWorkflowPeriods() {
  try {
    console.log('Starting workflow periods update...\n');
    
    // First, check if pre-closing exists
    const { data: preClosingData, error: checkError } = await supabase
      .from('roleplay_workflow_periods')
      .select('*')
      .eq('id', 'pre-closing')
      .single();
    
    if (preClosingData) {
      console.log('Found pre-closing period, deleting...');
      // Delete pre-closing period
      const { error: deleteError } = await supabase
        .from('roleplay_workflow_periods')
        .delete()
        .eq('id', 'pre-closing');
      
      if (deleteError) {
        console.error('Error deleting pre-closing:', deleteError);
        return;
      }
      console.log('✓ Successfully deleted pre-closing period');
    } else {
      console.log('Pre-closing period already deleted or not found');
    }
    
    // Update closing period
    console.log('\nUpdating closing period time...');
    const { error: updateError } = await supabase
      .from('roleplay_workflow_periods')
      .update({
        start_time: '21:30',
        end_time: '08:00',
        display_order: 7
      })
      .eq('id', 'closing');
    
    if (updateError) {
      console.error('Error updating closing:', updateError);
      return;
    }
    console.log('✓ Successfully updated closing period to 21:30-08:00');
    
    // Update all display orders
    console.log('\nUpdating display orders...');
    const periods = [
      { id: 'opening', display_order: 1 },
      { id: 'lunch-prep', display_order: 2 },
      { id: 'lunch-service', display_order: 3 },
      { id: 'lunch-closing', display_order: 4 },
      { id: 'dinner-prep', display_order: 5 },
      { id: 'dinner-service', display_order: 6 },
      { id: 'closing', display_order: 7 }
    ];
    
    for (const period of periods) {
      const { error } = await supabase
        .from('roleplay_workflow_periods')
        .update({ display_order: period.display_order })
        .eq('id', period.id);
      
      if (error) {
        console.error(`Error updating ${period.id}:`, error);
      }
    }
    console.log('✓ Successfully updated display orders');
    
    // Get all periods to verify
    console.log('\nFetching current workflow periods...');
    const { data, error } = await supabase
      .from('roleplay_workflow_periods')
      .select('id, name, display_name, start_time, end_time, display_order')
      .order('display_order');
    
    if (error) {
      console.error('Error fetching periods:', error);
      return;
    }
    
    console.log('\nCurrent workflow periods:');
    console.table(data);
    
    console.log('\n✅ Workflow periods update completed successfully!');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateWorkflowPeriods();
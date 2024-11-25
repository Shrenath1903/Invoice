function onDecimalLiveChange(oEvent) {
    var oControl = oEvent.getSource();
    var oValue = oControl.getValue();

    var numberReg = /^[0-9]*(\.[0-9]{0,2})?$/;
    if (oValue.match(numberReg)) {} else {
        oValue = oValue.slice(0, oValue.length - 1);
        oControl.setValue(oValue);
        return;
    }
    var regexp = /^[0-9]*(\.[0-9]{0,2})?$/;
    try {
        if (regexp.test(oValue)) {
            oControl.setValueState(sap.ui.core.ValueState.None);
           
        } else {
            oControl.setValueState(sap.ui.core.ValueState.Error);
        }
    } catch (ex) {
        oControl.setValueState(sap.ui.core.ValueState.Error);
    }
}

function validateNumber(oEvent)
{
	var input = oEvent.getSource();
	var value = input.getValue();
	var numberReg = /^[0-9]+$/;
		 
		if (value.match(numberReg)) 
		{
			//input.setValue(value);
		} 
		else 
		{
			value = value.slice(0, value.length - 1);
			input.setValue(value);
			input.setValueStateText("Only Number");
			input.setValueState("Error");
		}
		
		if (value.match(numberReg)) 
		{
			//input.setValue(value);
		}
		else
		{
			input.setValue("");
		}
		
	

}
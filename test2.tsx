import React, { useEffect } from "react";
import { Select, MenuItem, FormControl, InputLabel, OutlinedInput, SelectChangeEvent, IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Importing Info icon for the tooltip

interface DropdownProps {
    fieldKey: string;
    dataTemp: any;
    formData: any;
    handleInputChange: (key: string, value: any) => void;
    isRequired: boolean;
    supported_llms: string[];
    agentDetailModel: string;
}

const Dropdown: React.FC<DropdownProps> = ({
    fieldKey,
    dataTemp,
    formData,
    handleInputChange,
    isRequired,
    supported_llms,
    agentDetailModel
}) => {
    useEffect(() => {
        if ((fieldKey === 'model' || fieldKey === 'agent_model') && (formData[fieldKey] === undefined || formData[fieldKey] === "")) {
            handleInputChange(fieldKey, agentDetailModel); // Fallback default
        }
    }, [formData, fieldKey, handleInputChange]);

    const handleChange = (event: SelectChangeEvent<any>) => {
        handleInputChange(fieldKey, event.target.value);
    };
    const selectedValue = formData[fieldKey] || agentDetailModel;

    return (
        <div className="">
            <label className="agent-form-label tw-label-width tw-text-primaryText">
                {dataTemp.title}
                {isRequired && <span className="tw-text-red-500 tw-ml-1" style={{ color: 'red' }}>*</span>}
                {dataTemp.description && (
                    <Tooltip title={dataTemp.description} placement="right">
                        <IconButton style={{ color: "#3578FF", padding: "1px", background: "none" }}>
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </label>
            {/*agent-form-dropdown*/}
            <FormControl fullWidth variant="outlined">
                <Select
                    className=""
                    aria-label={dataTemp.title}
                    renderValue={(selected) => selected || agentDetailModel}
                    value={selectedValue}
                    onChange={handleChange}
                    label={dataTemp.title}
                    input={<OutlinedInput label={dataTemp.title} />}
                >
                    {supported_llms && supported_llms.map((llm, index) => (
                        <MenuItem key={index} value={llm}>
                            {llm}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );
};

export default Dropdown;

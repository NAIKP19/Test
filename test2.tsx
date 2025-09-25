import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Grid,
  IconButton,
  Modal,
  ThemeProvider,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultIgnoreFields } from "../../helpers/constants/agentFormMockData";
import { PromptContext } from "../../helpers/contexts/promptLibraryContext";
import { agentFormInputModalProps } from "../../helpers/interfaces/AgentFormInput";
import Theme from "../../styles/muiTheme-frontdoor";
import CommonComponents from "../common/AgentFormFields/CommonComponents";
import DotAnimation from "../common/DotAnimation/DotAnimation";
import ToastMessage, { TOAST_TYPE } from "../common/ToastMessage/ToastMessage";
import "./AgentFormInputModal.scss";
import Loader from "../common/Loader/Loader";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

function usePrevious(value: any) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const AgentFormInputModal = ({
  openAgent = false,
  agentDetail,
  handleCloseAgent,
  onSubmitCallBack = (selected, mockupUpdate) => { },
  ignoreFields = defaultIgnoreFields,
  title = null,
  showComplexFields = false,
  chipData,
  loading = false,
  resetFormTrigger,
  failedCondition = "This agent currently does not have any skill configurations.",
  defaultSelectedParameters = {},
}: agentFormInputModalProps) => {
  const [isLoading, setLoading] = useState(loading);
  const [openToast, setOpenToast] = useState<boolean>(false);
  const [childProperties, setChildProperties] = useState({});
  const [toastInfo, setToastInfo] = useState({
    message: "",
    severity: TOAST_TYPE.SUCCESS,
  });
  const [localAgentDetail, setLocalAgentDetail] = useState(agentDetail);
  const [browserFields] = useState<string[]>(ignoreFields);
  const [formData2, setFormData2] = useState<any>({});

  useEffect(() => {
    setLoading(loading);
  }, [loading])

  const [formData, setFormData] = useState<any>(() => {
    const initialState: any = {};
    const allFields = (localAgentDetail?.skills_config || []).flatMap(
      (skill: any) => Object.entries(skill.input_schema?.properties || {})
    );

    allFields.forEach(([key, value]: any) => {
      if (!browserFields.includes(key)) {
        initialState[key] = value.default === "None" ? "" : value.default || "";
      }
    });

    initialState.agent_model = localAgentDetail?.model || "";
    initialState.agent_system_prompt = localAgentDetail?.system_prompt || "";

    if (Object.keys(defaultSelectedParameters).length > 0) {
      return {
        ...initialState,
        ...defaultSelectedParameters
      };
    }

    return initialState;
  });

  useEffect(() => {
    setLocalAgentDetail(agentDetail);
  }, [agentDetail])

  useEffect(() => {
    if (agentDetail && (!formData?.agent_model || !formData?.agent_system_prompt)) {
      setFormData((prevState) => ({
        ...prevState,
        agent_model: agentDetail?.model || '',
        agent_system_prompt: agentDetail?.system_prompt || '',
      }));
    }
  }, [agentDetail]);

  const combinedProperties = useMemo(() => {
    return (localAgentDetail?.skills_config || []).reduce(
      (acc, skill) => ({
        ...acc,
        ...(skill.input_schema?.properties || {}),
      }),
      {}
    );
  }, [localAgentDetail]);

  const isSubmitDisabled = useMemo(() => {
    const requiredFields = new Set();
    const allSchemas = localAgentDetail?.skills_config?.reduce((acc, skill) => ({
      ...acc,
      ...(skill.input_schema?.properties || {}),
      ...Object.entries(skill.input_schema?.$defs || {}).reduce((defsAcc, [key, def]) => ({ ...defsAcc, [key]: def }), {})
    }), {});

    (localAgentDetail?.skills_config || []).forEach(skill => {
      (skill.input_schema?.required || []).forEach(key => {
        if (!browserFields.includes(key)) {
          const schema = allSchemas?.[key] || skill.input_schema.properties[key];
          if (schema && schema?.type !== "null" && !schema?.anyOf?.some(item => item?.type === "null")) {
            requiredFields.add(key);
          }
        }
      });

      Object.entries(skill.input_schema?.properties || {}).forEach(([, data]: any) => {
        if (data?.$ref || data?.anyOf?.some(item => item?.$ref)) {
          const reference = data?.$ref || data?.anyOf?.find(item => item?.$ref)?.$ref;
          if (reference) {
            const referenceKeys = reference.replace("#/$defs/", "");
            const def = skill.input_schema?.$defs?.[referenceKeys];
            if (def) {
              (def.required || []).forEach(dynamicKey => {
                if (!browserFields.includes(dynamicKey)) {
                  requiredFields.add(dynamicKey);
                }
              });
            }
          }
        }
      });
    });

    // THis Validation is for the Model Driopdown of the Agent not Skill
    if (localAgentDetail?.model) {
      requiredFields.add('agent_model');
    }

    return [...requiredFields].some((fieldKey: any) => {
      const value = formData[fieldKey];
      const fieldSchema = allSchemas?.[fieldKey];

      if (fieldSchema?.default === null || fieldSchema?.anyOf?.some(item => item?.type === "null")) {
        return false;
      }
      const isEmpty = (val: any) => {
        if (val === undefined || val === null || val === "") return true;
        if (Array.isArray(val) && val.length === 0) return true;
        if (typeof val === "object" && Object.keys(val).length === 0) return true;
        return false;
      };

      return isEmpty(value);
    });
  }, [formData, localAgentDetail, browserFields, combinedProperties]);

  useEffect(() => {
    if (resetFormTrigger !== undefined) {
      const initialState: any = {};
      const allFields = (localAgentDetail?.skills_config || []).flatMap(
        (skill: any) => Object.entries(skill.input_schema?.properties || {})
      );

      allFields.forEach(([key, value]: any) => {
        if (!browserFields.includes(key)) {
          initialState[key] =
            value.default === "None" ? "" : value.default || "";
        }
      });

      initialState.agent_model = localAgentDetail?.model || "";
      initialState.agent_system_prompt = localAgentDetail?.system_prompt || "";

      setFormData(initialState);
      setFormData2({});
    }
  }, [resetFormTrigger, localAgentDetail?.agent_id, browserFields]);

  const updateDefaultsInSkillsConfig = (
    agentDetailtemp: any,
    defaultParams: any
  ) => {
    const skills = agentDetailtemp.skills_config;
    if (!skills || !Array.isArray(skills)) return agentDetailtemp;

    for (const skill of skills) {
      const inputSchema = skill.input_schema;
      const queryParams = defaultParams.query_params;

      if (!inputSchema?.$defs || !queryParams) continue;

      const queryParamKeys = Object.keys(queryParams);
      let bestMatchKey = "";
      let maxMatches = 0;

      for (const [key, schema] of Object.entries<any>(inputSchema.$defs)) {
        const schemaKeys = Object.keys(schema.properties || {});
        const matches = schemaKeys.filter((k) =>
          queryParamKeys.includes(k)
        ).length;

        if (matches > maxMatches) {
          bestMatchKey = key;
          maxMatches = matches;
        }
      }

      if (!bestMatchKey) continue;

      const matchedSchema = inputSchema.$defs[bestMatchKey];
      for (const [key, value] of Object.entries(queryParams)) {
        if (matchedSchema.properties?.[key]) {
          matchedSchema.properties[key].default = value;
        }
      }
      inputSchema.$defs[bestMatchKey] = matchedSchema;
      skill.input_schema = inputSchema;
    }
    return agentDetailtemp;
  };

  const handleDynamicFieldChange = (
    fieldKey: string,
    value: any,
    key: string
  ) => {
    setFormData2((prevState: any) => {
      const updatedFormData = {
        ...prevState,
        [fieldKey]: value,
      };
      setFormData((oldState: any) => ({
        ...oldState,
        [key]: updatedFormData,
      }));
      return updatedFormData;
    });
  };

  const closePrompt = () => {
    handleCloseAgent();
  };

  const mockupUpdate = (query: string) => {
    if (combinedProperties.query) {
      formData["query"] = query;
    } else if (combinedProperties.user_query) {
      formData["user_query"] = query;
    }
    if (Object.keys(childProperties).length > 0) {
      Object.entries(childProperties).map(([key, value]) => {
        if (Object.keys(value).includes("query")) {
          formData[key].query = query;
        } else if (Object.keys(value).includes("user_query")) {
          formData[key].user_query = query;
        }
      });
    }
    return formData;
  };

  function transformAgentConfig(inputJson) {
    const result = {
      agent_input: {},
      agent_skill_inputs: {}
    };

    for (const key in inputJson) {
      if (inputJson.hasOwnProperty(key)) {
        if (key.startsWith('agent_')) {
          result.agent_input[key] = inputJson[key];
        } else {
          result.agent_skill_inputs[key] = inputJson[key];
        }
      }
    }

    return result;
  }
  const chooseHandle = () => {
    let finalFormData: any = transformAgentConfig(formData);
    onSubmitCallBack(finalFormData, mockupUpdate);
  };

  const handleInputChange = useCallback((key: string, value: any) => {
    setFormData((prevState: any) => {
      const updatedFormData = { ...prevState, [key]: value };
      return updatedFormData;
    });
  }, []);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  function transformTitile(str: string) {
    return str && str
      .split(/[-\s]/)
      .map(word =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      )
      .join(' ');
  }

  const renderSkillSections = () => {
    if (!localAgentDetail?.skills_config?.length) {
      return (
        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
              padding: '20px',
              border: '1px dashed #ccc',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            {/* <InfoIcon sx={{ fontSize: 48, color: 'text.disabled', marginBottom: '10px' }} /> */}
            <Typography variant="subtitle1" component="h5" sx={{ color: 'text.secondary' }}>
              {failedCondition}
            </Typography>
          </Box>
        </Grid>
      );
    }

    const toggleCollapse = (skillName: string) => {
      setCollapsedSections(prevState => ({
        ...prevState,
        [skillName]: !prevState[skillName]
      }));
    };

    return localAgentDetail.skills_config && localAgentDetail.skills_config.map((skill: any, skillIndex: number) => {
      const skillName = skill.name || `Skill ${skillIndex + 1}`;
      const isCollapsed = collapsedSections[skillName];
      const skillProperties = Object.entries(skill.input_schema?.properties || {});
      const skillRequired = skill.input_schema?.required || [];
      const filteredProperties = skillProperties.filter(([key]) => {
        return !browserFields.includes(key) && key !== "query_params";
      });

      const dynamicRefs = skillProperties.filter(([, value]: any) => value?.$ref || value?.anyOf?.[0]?.$ref);
      const skillDynamicFields: { [key: string]: any } = {};

      dynamicRefs.forEach(([, value]: any) => {
        const reference = value?.$ref || value?.anyOf?.[0]?.$ref;
        const referenceKeys = reference.replace("#/", "").split("/");
        const def = skill.input_schema?.$defs?.[referenceKeys[1]];
        if (def) {
          Object.entries(def.properties || {}).forEach(([dynamicKey, dynamicValue]: any) => {
            if (!browserFields.includes(dynamicKey)) {
              skillDynamicFields[dynamicKey] = {
                ...dynamicValue,
                required: (def.required || []).includes(dynamicKey)
              };
            }
          });
        }
      });

      const allSkillFields = [
        ...filteredProperties,
        ...Object.entries(skillDynamicFields)
      ];

      allSkillFields.sort(([keyA, fieldA]: any, [keyB, fieldB]: any) => {
        const isRequiredA = skillRequired.includes(keyA) || fieldA.required;
        const isRequiredB = skillRequired.includes(keyB) || fieldB.required;

        if (isRequiredA && !isRequiredB) {
          return -1;
        }
        if (!isRequiredA && isRequiredB) {
          return 1;
        }
        return 0;
      });

      return (
        <Box
          key={skillName}
          sx={{
            marginBottom: '20px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            width: '100%'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              cursor: 'pointer',
            }}
            onClick={() => toggleCollapse(skillName)}
          >
            <Typography variant="h6" className="skill-section-title">
              {transformTitile(skillName)}
            </Typography>
            <IconButton size="small">
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </Box>
          {!isCollapsed && (
            <Grid container spacing={2} className="skill-form-grid">
              {allSkillFields.map(([fieldKey, widget]: any) => (
                <Grid
                  item xs={12} sm={12} md={6} lg={6} xl={3}
                  className="grid-padding"
                  key={`${skillName}-${fieldKey}`}
                >
                  <CommonComponents
                    fieldKey={fieldKey}
                    datavlaue={widget}
                    handleInputChange={handleInputChange}
                    formData={formData}
                    agentDetail={localAgentDetail}
                    browserFields={browserFields}
                    isRequiredField={skillRequired.includes(fieldKey) || widget.required}
                    chipData={chipData}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      );
    });
  };

  return (
    <ThemeProvider theme={Theme}>
      <Modal
        className="modal-cstm-container"
        open={openAgent}
        onClose={closePrompt}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        style={{ zIndex: 900 }}
      >
        <>
          <ToastMessage
            severity={toastInfo.severity}
            isVisible={openToast}
            hideToast={setOpenToast}
            message={toastInfo.message}
          />
          <Box className="modal-cstm-box">
            <PromptContext.Provider value={{ isLoading, setLoading }}>
              <Grid container spacing={0} className="model-header">
                <Grid item xs={10} md={10}>
                  <Typography className="modalTitle" variant="h6">
                    <div className="Agent-name">
                      {title && transformTitile(title) || transformTitile(localAgentDetail?.name)}
                      {!localAgentDetail?.name && <DotAnimation />}
                    </div>
                  </Typography>
                </Grid>
                <Grid item xs={2} md={2}>
                  <div className="closebtn-parent">
                    <IconButton
                      onClick={closePrompt}
                      className="modalclose-cstm"
                    >
                      <CloseIcon />
                    </IconButton>
                  </div>
                </Grid>
              </Grid>
              {!isLoading ? (
                <Grid container spacing={0} className="agent-container">
                  <div style={{ marginBottom: '20px', width: '100%' }}>
                    <Typography variant="h6" className="skill-section-title">
                      Agent Input
                    </Typography>
                    {agentDetail &&
                      <>
                        <Box
                          key={"Agent"}
                          sx={{
                            marginBottom: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '16px',
                            width: '100%'
                          }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={12} md={6} lg={6} xl={3} className="grid-padding">
                              <CommonComponents
                                fieldKey="agent_model"
                                datavlaue={{ title: "Model", type: "string" }}
                                handleInputChange={handleInputChange}
                                formData={formData}
                                agentDetail={localAgentDetail}
                                browserFields={browserFields}
                                isRequiredField={true}
                                chipData={chipData}
                              />
                            </Grid>
                            <Grid item xs={12} sm={12} md={6} lg={6} xl={3} className="grid-padding">
                              <CommonComponents
                                fieldKey="agent_system_prompt"
                                datavlaue={{ title: "System Prompt", type: "string", format: "text-area" }}
                                handleInputChange={handleInputChange}
                                formData={formData}
                                agentDetail={localAgentDetail}
                                browserFields={browserFields}
                                isRequiredField={false}
                                chipData={chipData}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </>
                    }
                  </div>
                  <Typography variant="h6" className="skill-section-title mb-2">
                    {'Agent Skill Inputs'}

                  </Typography>
                  {renderSkillSections()}
                </Grid>
              ) : (
                <div className="loader-center add-height">
                  <Loader isLoading={isLoading} />
                </div>
              )}
              <div className="tw-flex tw-flex-row tw-justify-center tw-items-center choose-cancel-button">
                <div className="tw-w-4/4 tw-mr-2 tw-flex">
                  <div className="tw-mr-right tw-mr-[20px]">
                    <Button
                      variant="contained"
                      onClick={closePrompt}
                      className="tw-w-full tw-flex tw-flex-row tw-w-[140px] tw-justify-end tw-items-center tw-cursor-pointer cancel-button"
                    >
                      <span>Cancel</span>
                    </Button>
                  </div>
                  <div>
                    <Button
                      disabled={isSubmitDisabled}
                      variant="contained"
                      onClick={chooseHandle}
                      className={
                        !isSubmitDisabled
                          ? "tw-w-full tw-flex tw-flex-row tw-w-[140px] tw-justify-end tw-items-center tw-cursor-pointer choose-button"
                          : "tw-w-full tw-flex tw-flex-row tw-w-[140px] tw-justify-end tw-items-center tw-cursor-pointer choose-button disabled-select-button"
                      }
                    >
                      <span>Submit</span>
                    </Button>
                  </div>
                </div>
              </div>
            </PromptContext.Provider>
          </Box>
        </>
      </Modal>
    </ThemeProvider>
  );
};

export default AgentFormInputModal;

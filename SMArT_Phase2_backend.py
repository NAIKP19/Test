from flask import Flask
from webaiku.extension import WEBAIKU
from SMArT_App.backend.fetch_api import fetch_api
from SMArT_App.backend.app.site_activation.routes import site_activation_bp
from SMArT_App.backend.app.hl_modeling.routes import hl_modeling_bp
from SMArT_App.backend.app.run_analysis.routes import run_analysis_bp
from SMArT_App.backend.app.plan_audit.routes import plan_audit_bp
from SMArT_App.backend.app.common.routes import common_bp


WEBAIKU(app, "webapps/SMArT_App/dist")
WEBAIKU.extend(app, [fetch_api,site_activation_bp, hl_modeling_bp, run_analysis_bp, plan_audit_bp, common_bp])

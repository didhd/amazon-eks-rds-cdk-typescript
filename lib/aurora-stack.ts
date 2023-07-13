import { GlobalAuroraRDSMaster, InstanceTypeEnum, GlobalAuroraRDSSlaveInfra } from 'cdk-aurora-globaldatabase';
import { App, Stack, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as _rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';


export interface AuroraProps extends cdk.StackProps {
    vpc: ec2.IVpc
}

export class AuroraPrimaryStack extends cdk.Stack {
    public readonly globaldbM: GlobalAuroraRDSMaster;

    constructor(scope: Construct, id: string, props: AuroraProps) {
        super(scope, id, props);

        const vpcPublic = props.vpc

        // Note if you use postgres , need to give the same value in engineVersion and  dbClusterpPG's engine .
        this.globaldbM = new GlobalAuroraRDSMaster(this, 'globalAuroraRDSMaster', {
            instanceType: InstanceTypeEnum.R5_LARGE,
            vpc: vpcPublic,
            rdsPassword: '1qaz2wsx',
            engineVersion: _rds.DatabaseClusterEngine.auroraPostgres({
                version: _rds.AuroraPostgresEngineVersion.VER_12_11
            }),
            dbClusterpPG: new _rds.ParameterGroup(this, 'dbClusterparametergroup', {
                engine: _rds.DatabaseClusterEngine.auroraPostgres({
                    version: _rds.AuroraPostgresEngineVersion.VER_12_11,
                }),
                parameters: {
                    'rds.force_ssl': '1',
                    'rds.log_retention_period': '10080',
                    'auto_explain.log_min_duration': '5000',
                    'auto_explain.log_verbose': '1',
                    'timezone': 'UTC+8',
                    'shared_preload_libraries': 'auto_explain,pg_stat_statements,pg_hint_plan,pgaudit',
                    'log_connections': '1',
                    'log_statement': 'ddl',
                    'log_disconnections': '1',
                    'log_lock_waits': '1',
                    'log_min_duration_statement': '5000',
                    'log_rotation_age': '1440',
                    'log_rotation_size': '102400',
                    'random_page_cost': '1',
                    'track_activity_query_size': '16384',
                    'idle_in_transaction_session_timeout': '7200000',
                },
            }),
        });
        this.globaldbM.rdsCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4(`0.0.0.0/32`))

        // new CfnOutput(this, 'password', { value: globaldbM.rdsPassword });
    }
}

export class AuroraSecondaryStack extends cdk.Stack {
    public readonly globaldbS: GlobalAuroraRDSSlaveInfra;

    constructor(scope: Construct, id: string, props: AuroraProps) {
        super(scope, id, props);

        const vpcPublic2 = props.vpc
        this.globaldbS = new GlobalAuroraRDSSlaveInfra(this, 'slaveregion', {
            vpc: vpcPublic2, subnetType: ec2.SubnetType.PUBLIC,
        });

    }
}

